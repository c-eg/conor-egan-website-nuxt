import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { browseScript, exitUnlessRunFromProjectRoot, outputDirectory, projectRoot, readServerState, serverLogFile, serverScript, serverStateFile } from "./paths.mjs";

const nuxtCli = resolve(projectRoot, "node_modules/nuxt/bin/nuxt.mjs");
const apiMocksMode = "api-mocks";
const noApiMocksMode = "no-api-mocks";
const startupTimeoutMs = 180_000;
const startupPollIntervalMs = 500;
const statusRequestTimeoutMs = 10_000;
const nuxtStartingUpStatus = 503;
const logLinesShownOnFailure = 40;
const nuxtDevLockMessage = "Another Nuxt dev server is already running";

const usage = `Usage: node ${serverScript} start [--no-api-mocks] | status | stop`;

exitUnlessRunFromProjectRoot();

const { positionals: [command = "status"], values: options } = parseArgumentsOrExit({
    allowPositionals: true,
    allowNegative: true,
    options: {
        [apiMocksMode]: { type: "boolean", default: true }
    }
});

const commands = { start, stop, status };

if (!(command in commands)) {
    fail(`Unknown command "${command}".\n${usage}`);
}

await commands[command]();

async function start() {
    const mode = options[apiMocksMode] ? apiMocksMode : noApiMocksMode;
    const running = readServerState();
    if (running && await isServing(running.url, statusRequestTimeoutMs)) {
        if (running.mode !== mode) {
            fail(`A ${running.mode} server is already running at ${running.url}. Run \`node ${serverScript} stop\`, then start the ${mode} server.`);
        }
        console.log(`Already running (${running.mode}) at ${running.url}`);
        return;
    }
    if (running) {
        killProcessTree(running.pid);
    }

    if (!existsSync(nuxtCli)) {
        fail("Dependencies are not installed. Run `pnpm install` first.");
    }

    if (mode === noApiMocksMode && !existsSync(resolve(projectRoot, ".env"))) {
        console.warn("Warning: no .env file, so requests to the real APIs go out without the credentials and settings it provides.");
    }

    mkdirSync(outputDirectory, { recursive: true });
    const port = await findFreePort();
    const url = `http://localhost:${port}`;
    const log = openSync(serverLogFile, "w");

    const server = spawn(process.execPath, [nuxtCli, ...nuxtArguments(mode, port)], {
        cwd: projectRoot,
        detached: true,
        stdio: ["ignore", log, log],
        windowsHide: true
    });
    server.unref();
    writeFileSync(serverStateFile, JSON.stringify({ pid: server.pid, mode, url }, null, 2));

    const homeStatus = await waitForServer(url, server);
    console.log(`Server ready (${mode}) at ${url}`);
    console.log(`Log: ${serverLogFile}`);
    if (homeStatus !== 200) {
        console.warn(`Warning: the home page responded with HTTP ${homeStatus}. Check the log.`);
    }
}

function stop() {
    const running = readServerState();
    if (!running) {
        console.log("No server is running.");
        return;
    }
    killProcessTree(running.pid);
    rmSync(serverStateFile, { force: true });
    console.log(`Stopped the ${running.mode} server at ${running.url}`);
}

async function status() {
    const running = readServerState();
    if (!running) {
        console.log(`No server is running. Start one with \`node ${serverScript} start\`.`);
        return;
    }
    if (await isServing(running.url, statusRequestTimeoutMs)) {
        console.log(`Running (${running.mode}) at ${running.url}`);
        console.log(`Log: ${serverLogFile}`);
        return;
    }
    console.log(`Not responding at ${running.url}. Check ${serverLogFile}, then stop and start it again.`);
    process.exitCode = 1;
}

function nuxtArguments(mode, port) {
    const devArguments = ["dev", "--port", String(port), "--strictPort", "--no-takeover", "--no-tui"];
    return mode === noApiMocksMode ? [...devArguments, "--envName", noApiMocksMode] : devArguments;
}

async function waitForServer(url, server) {
    const deadline = Date.now() + startupTimeoutMs;
    while (Date.now() < deadline) {
        if (server.exitCode !== null) {
            rmSync(serverStateFile, { force: true });
            fail(startupFailureMessage(server.exitCode));
        }
        const homeStatus = await fetchStatus(url, deadline - Date.now());
        if (homeStatus !== undefined && homeStatus !== nuxtStartingUpStatus) {
            return homeStatus;
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, startupPollIntervalMs));
    }
    killProcessTree(server.pid);
    rmSync(serverStateFile, { force: true });
    fail(`The server did not respond within ${startupTimeoutMs / 1000}s:\n${tailOfLog()}`);
}

async function isServing(url, timeoutMs) {
    const homeStatus = await fetchStatus(url, timeoutMs);
    return homeStatus !== undefined && homeStatus !== nuxtStartingUpStatus;
}

async function fetchStatus(url, timeoutMs) {
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        return response.status;
    } catch {
        return undefined;
    }
}

function findFreePort() {
    return new Promise((resolvePort, reject) => {
        const probe = createServer();
        probe.on("error", reject);
        probe.listen(0, () => {
            const { port } = probe.address();
            probe.close(() => resolvePort(port));
        });
    });
}

function killProcessTree(pid) {
    if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
    } else if (isProcessAlive(pid)) {
        process.kill(-pid, "SIGTERM");
    }
}

function isProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function startupFailureMessage(exitCode) {
    if (readFileSync(serverLogFile, "utf8").includes(nuxtDevLockMessage)) {
        return [
            "Another Nuxt dev server, probably the user's own, is already running in this project, and Nuxt allows only one per directory.",
            "Don't stop it or bypass Nuxt's lock with NUXT_IGNORE_LOCK.",
            `Ask the user to stop it, or browse it with \`node ${browseScript} --base-url <its URL>\`.`
        ].join("\n");
    }
    return `The server exited with code ${exitCode}:\n${tailOfLog()}`;
}

function tailOfLog() {
    return readFileSync(serverLogFile, "utf8").trimEnd().split(/\r?\n/).slice(-logLinesShownOnFailure).join("\n");
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
