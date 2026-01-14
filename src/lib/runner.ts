import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPlatform } from "./utils.ts";

const TEMP_DIR = "./temp";

const LINUX_TERMINALS = [
	{ cmd: "gnome-terminal", args: (script: string) => ["--", "bash", script] },
	{ cmd: "konsole", args: (script: string) => ["-e", "bash", script] },
	{
		cmd: "xfce4-terminal",
		args: (script: string) => ["-e", `bash "${script}"`],
	},
	{ cmd: "alacritty", args: (script: string) => ["-e", "bash", script] },
	{ cmd: "kitty", args: (script: string) => ["bash", script] },
	{ cmd: "wezterm", args: (script: string) => ["start", "--", "bash", script] },
	{ cmd: "foot", args: (script: string) => ["bash", script] },
	{ cmd: "tilix", args: (script: string) => ["-e", `bash "${script}"`] },
	{ cmd: "terminator", args: (script: string) => ["-e", `bash "${script}"`] },
	{
		cmd: "mate-terminal",
		args: (script: string) => ["-e", `bash "${script}"`],
	},
	{ cmd: "lxterminal", args: (script: string) => ["-e", `bash "${script}"`] },
	{ cmd: "xterm", args: (script: string) => ["-hold", "-e", "bash", script] },
	{ cmd: "urxvt", args: (script: string) => ["-hold", "-e", "bash", script] },
	{ cmd: "st", args: (script: string) => ["-e", "bash", script] },
	{
		cmd: "x-terminal-emulator",
		args: (script: string) => ["-e", `bash "${script}"`],
	},
];

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

	return `#!/usr/bin/env bash
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

	const userTerminal = process.env.TERMINAL;
	let terminalApp = "Terminal";

	if (userTerminal) {
		terminalApp = userTerminal;
	} else {
		const termProgram = process.env.TERM_PROGRAM;
		if (termProgram) {
			const termMap: Record<string, string> = {
				iTerm: "iTerm",
				"iTerm.app": "iTerm",
				Apple_Terminal: "Terminal",
				kitty: "kitty",
				Alacritty: "Alacritty",
				WezTerm: "WezTerm",
				Hyper: "Hyper",
			};
			terminalApp = termMap[termProgram] || terminalApp;
		}
	}

	if (["kitty", "Alacritty", "WezTerm"].includes(terminalApp)) {
		const cmdMap: Record<string, { cmd: string; args: string[] }> = {
			kitty: { cmd: "kitty", args: ["bash", absolutePath] },
			Alacritty: { cmd: "alacritty", args: ["-e", "bash", absolutePath] },
			WezTerm: { cmd: "wezterm", args: ["start", "--", "bash", absolutePath] },
		};
		const config = cmdMap[terminalApp];
		if (config) {
			spawnSync(config.cmd, config.args, { stdio: "inherit" });
			return;
		}
	}

	const script = `tell app "${terminalApp}" to do script "bash \\"${escapedPath}\\""`;
	spawnSync("osascript", ["-e", script], {
		stdio: "inherit",
	});
}

function executeLinux(scriptPath: string): void {
	const absolutePath = join(process.cwd(), scriptPath);
	const userTerminal = process.env.TERMINAL;

	if (userTerminal) {
		const result = spawnSync("which", [userTerminal], { encoding: "utf-8" });
		if (result.status === 0) {
			const terminalConfig = LINUX_TERMINALS.find(
				(t) => t.cmd === userTerminal,
			);
			const args = terminalConfig
				? terminalConfig.args(absolutePath)
				: ["-e", `bash "${absolutePath}"`];
			spawnSync(userTerminal, args, { stdio: "inherit" });
			return;
		}
		console.warn(
			`Warning: Configured terminal '${userTerminal}' not found, falling back to auto-detection`,
		);
	}

	for (const terminal of LINUX_TERMINALS) {
		const result = spawnSync("which", [terminal.cmd], { encoding: "utf-8" });
		if (result.status === 0) {
			spawnSync(terminal.cmd, terminal.args(absolutePath), {
				stdio: "inherit",
			});
			return;
		}
	}

	const triedTerminals = LINUX_TERMINALS.map((t) => t.cmd).join(", ");
	console.error("No supported terminal emulator found.");
	console.error(`Tried: ${triedTerminals}`);
	console.error("");
	console.error("Solutions:");
	console.error(
		"  1. Install a terminal emulator (e.g., apt install gnome-terminal)",
	);
	console.error(
		"  2. Set TERMINAL env variable to your terminal's command name",
	);
	console.error("  3. Run the script manually:", absolutePath);
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
