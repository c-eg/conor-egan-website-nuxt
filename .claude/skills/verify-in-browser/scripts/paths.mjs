import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const projectRoot = process.cwd();
export const outputDirectory = resolve(projectRoot, ".playwright");
export const serverStateFile = resolve(outputDirectory, "server.json");
export const serverLogFile = resolve(outputDirectory, "server.log");
export const serverScript = scriptPath("server.mjs");
export const browseScript = scriptPath("browse.mjs");

function scriptPath(fileName) {
    return resolve(import.meta.dirname, fileName).replaceAll("\\", "/");
}

export function exitUnlessRunFromProjectRoot() {
    if (!existsSync(resolve(projectRoot, "nuxt.config.ts"))) {
        console.error(`Run this from the project root, the directory containing nuxt.config.ts. The current directory is ${projectRoot}.`);
        process.exit(1);
    }
}

export function readServerState() {
    return existsSync(serverStateFile) ? JSON.parse(readFileSync(serverStateFile, "utf8")) : undefined;
}
