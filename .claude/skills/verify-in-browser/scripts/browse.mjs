import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { chromium, devices } from "playwright";
import { browseScript, exitUnlessRunFromProjectRoot, outputDirectory, readServerState, serverScript } from "./paths.mjs";

const viewportPresets = {
    mobile: devices["Pixel 7"],
    tablet: devices["Galaxy Tab S4"],
    desktop: devices["Desktop Chrome"]
};

const hideNuxtDevTools = "#nuxt-devtools-container, nuxt-devtools-inspect-panel, #vue-tracer-overlay { display: none !important; }";

const usage = `Usage: node ${browseScript} [page] [--viewport mobile,tablet,desktop,WIDTHxHEIGHT] [--scenario file] [--full-page] [--out dir] [--base-url url] [--headed]`;

exitUnlessRunFromProjectRoot();

const { positionals: [pathArgument = "/"], values: options } = parseArgumentsOrExit({
    allowPositionals: true,
    options: {
        scenario: { type: "string" },
        viewport: { type: "string", default: "desktop" },
        "full-page": { type: "boolean", default: false },
        out: { type: "string", default: resolve(outputDirectory, "screenshots") },
        "base-url": { type: "string" },
        headed: { type: "boolean", default: false }
    }
});

const baseUrl = options["base-url"] ?? readServerState()?.url;
if (!baseUrl) {
    fail(`No server is running. Start one with \`node ${serverScript} start\`, or pass --base-url.`);
}

const startPath = toPagePath(pathArgument);
const viewports = options.viewport.split(",").map(parseViewport);
const scenario = options.scenario ? await loadScenario(options.scenario) : undefined;
const screenshotDirectory = resolve(options.out);
mkdirSync(screenshotDirectory, { recursive: true });

const browser = await chromium.launch({ headless: !options.headed });
try {
    for (const viewport of viewports) {
        const passed = await runInViewport(viewport);
        if (!passed) {
            process.exitCode = 1;
        }
    }
} finally {
    await browser.close();
}

async function runInViewport(viewport) {
    const context = await browser.newContext({ baseURL: baseUrl, ...viewport.device });
    const page = await context.newPage();
    const problems = collectProblems(page);
    const snapshots = createSnapshotter(page, viewport.name);
    const goto = (path) => gotoAndWaitForHydration(page, path);

    let failure;
    try {
        await goto(startPath);
        await scenario?.({ page, snapshot: snapshots.take, goto });
    } catch (error) {
        failure = error;
    }

    if (failure) {
        console.log(`\n!!! [${viewport.name}] Scenario failed: ${failure.message}`);
        await snapshots.take("failure").catch(() => undefined);
    } else if (snapshots.count() === 0) {
        await snapshots.take("page");
    }
    await context.close();

    reportProblems(viewport.name, problems);
    return failure === undefined && problems.length === 0;
}

async function gotoAndWaitForHydration(page, path) {
    const response = await page.goto(path);
    await page.waitForFunction(() => window.useNuxtApp?.().isHydrating === false);
    return response;
}

function createSnapshotter(page, viewportName) {
    let taken = 0;

    async function take(label, scope) {
        const file = resolve(screenshotDirectory, `${viewportName}-${toFileName(label)}.png`);
        const screenshotOptions = { path: file, animations: "disabled", style: hideNuxtDevTools };
        if (scope) {
            await scope.screenshot(screenshotOptions);
        } else {
            await page.screenshot({ ...screenshotOptions, fullPage: options["full-page"] });
        }
        const ariaSnapshot = await (scope ?? page.locator("#__nuxt")).ariaSnapshot();
        taken++;

        console.log(`\n=== [${viewportName}] ${label} ===`);
        console.log(`URL: ${page.url()}`);
        console.log(`Title: ${await page.title()}`);
        console.log(`Screenshot: ${file}`);
        console.log(ariaSnapshot);
    }

    return { take, count: () => taken };
}

function collectProblems(page) {
    const problems = [];
    page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") {
            problems.push(`console.${message.type()}: ${message.text()}`);
        }
    });
    page.on("pageerror", (error) => problems.push(`uncaught error: ${error.message}`));
    page.on("requestfailed", (request) => {
        problems.push(`request failed (${request.failure()?.errorText}): ${request.method()} ${request.url()}`);
    });
    page.on("response", (response) => {
        if (response.status() >= 400) {
            problems.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
        }
    });
    return problems;
}

function reportProblems(viewportName, problems) {
    if (problems.length === 0) {
        console.log(`\n[${viewportName}] No console errors or warnings, uncaught errors or failed requests.`);
        return;
    }
    console.log(`\n[${viewportName}] Problems:`);
    for (const problem of problems) {
        console.log(`- ${problem}`);
    }
}

function toPagePath(argument) {
    if (/^[A-Za-z]:[\\/]/.test(argument)) {
        fail(`"${argument}" is a file path, probably rewritten by Git Bash. Pass the page without its leading slash, for example \`projects\`.`);
    }
    return argument.startsWith("/") || /^https?:\/\//.test(argument) ? argument : `/${argument}`;
}

function parseViewport(name) {
    if (name in viewportPresets) {
        return { name, device: viewportPresets[name] };
    }
    const dimensions = name.match(/^(\d+)x(\d+)$/);
    if (!dimensions) {
        fail(`Unknown viewport "${name}". Use ${Object.keys(viewportPresets).join(", ")} or WIDTHxHEIGHT.`);
    }
    return { name, device: { viewport: { width: Number(dimensions[1]), height: Number(dimensions[2]) } } };
}

async function loadScenario(file) {
    const module = await import(pathToFileURL(resolve(file)).href);
    if (typeof module.default !== "function") {
        fail(`${file} must export a default async function.`);
    }
    return module.default;
}

function toFileName(label) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseArgumentsOrExit(config) {
    try {
        return parseArgs(config);
    } catch (error) {
        fail(`${error.message}\n${usage}`);
    }
}

function fail(message) {
    console.error(message);
    process.exit(1);
}
