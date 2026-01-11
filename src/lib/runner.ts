import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPlatform } from "./utils.ts";

const TEMP_DIR = "./temp";

function getClaudeCommand(
	featureFolderName: string,
	taskFilename: string,
	featureContext: string | null,
): string {
	const taskPath = `tasks/${featureFolderName}/${taskFilename}`;

	let prompt = `Read and execute the task in ${taskPath}.`;

	if (featureContext) {
		prompt += ` The feature context is in tasks/${featureFolderName}/README.md - read it first for context.`;
	}

	prompt += ` Follow the project's CLAUDE.md if it exists. Stay focused on this single task only.`;

	return `claude --dangerously-skip-permissions "${prompt}"`;
}

export function generateScript(
	projectPath: string,
	featureFolderName: string,
	taskFilename: string,
	featureContext: string | null,
): string {
	const platform = getPlatform();
	const claudeCmd = getClaudeCommand(
		featureFolderName,
		taskFilename,
		featureContext,
	);

	if (platform === "win32") {
		const winPath = projectPath.replace(/\//g, "\\");
		return `@echo off
cd /d "${winPath}"
${claudeCmd}
`;
	}

	return `#!/bin/bash
cd "${projectPath}"
${claudeCmd}
`;
}

export function writeScript(content: string): string {
	if (!existsSync(TEMP_DIR)) {
		mkdirSync(TEMP_DIR, { recursive: true });
	}

	const platform = getPlatform();
	const extension = platform === "win32" ? "bat" : "sh";
	const scriptPath = join(TEMP_DIR, `run-task.${extension}`);
	writeFileSync(scriptPath, content);

	if (platform !== "win32") {
		chmodSync(scriptPath, 0o755);
	}

	return scriptPath;
}

function executeWindows(scriptPath: string): void {
	const absolutePath = join(process.cwd(), scriptPath);
	spawnSync("cmd", ["/c", "start", "cmd", "/k", absolutePath], {
		stdio: "inherit",
		shell: true,
	});
}

function executeMacOS(scriptPath: string): void {
	const absolutePath = join(process.cwd(), scriptPath);
	const escapedPath = absolutePath.replace(/"/g, '\\"');
	const script = `tell app "Terminal" to do script "bash \\"${escapedPath}\\""`;
	spawnSync("osascript", ["-e", script], {
		stdio: "inherit",
	});
}

function executeLinux(scriptPath: string): void {
	const absolutePath = join(process.cwd(), scriptPath);

	const terminals = [
		{ cmd: "gnome-terminal", args: ["--", "bash", absolutePath] },
		{ cmd: "konsole", args: ["-e", "bash", absolutePath] },
		{ cmd: "xfce4-terminal", args: ["-e", `bash ${absolutePath}`] },
		{ cmd: "xterm", args: ["-hold", "-e", "bash", absolutePath] },
		{ cmd: "x-terminal-emulator", args: ["-e", "bash", absolutePath] },
	];

	for (const terminal of terminals) {
		const result = spawnSync("which", [terminal.cmd], { encoding: "utf-8" });
		if (result.status === 0) {
			spawnSync(terminal.cmd, terminal.args, {
				stdio: "inherit",
			});
			return;
		}
	}

	console.error(
		"No supported terminal emulator found. Tried: gnome-terminal, konsole, xfce4-terminal, xterm, x-terminal-emulator",
	);
	console.error("Please run the script manually:", absolutePath);
}

export function executeScript(scriptPath: string): void {
	const platform = getPlatform();

	switch (platform) {
		case "win32":
			executeWindows(scriptPath);
			break;
		case "darwin":
			executeMacOS(scriptPath);
			break;
		case "linux":
			executeLinux(scriptPath);
			break;
	}
}

export function launchTask(
	projectPath: string,
	featureFolderName: string,
	taskFilename: string,
	featureContext: string | null,
): string {
	const script = generateScript(
		projectPath,
		featureFolderName,
		taskFilename,
		featureContext,
	);
	const scriptPath = writeScript(script);
	executeScript(scriptPath);
	return scriptPath;
}
