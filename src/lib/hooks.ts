import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { HookConfig } from "../types/index.ts";
import { config } from "./config.ts";

function generateStopScript(taskId: string): string {
	const scriptPath = resolve(process.cwd(), "scripts", "hook-handler.ts");
	const normalizedPath = scriptPath.replace(/\\/g, "/");
	return `bun run "${normalizedPath}" "${taskId}" "${config.apiBaseUrl}"`;
}

export function generateHookConfig(taskId: string): HookConfig {
	return {
		hooks: {
			Stop: [
				{
					matcher: "",
					hooks: [
						{
							type: "command",
							command: generateStopScript(taskId),
						},
					],
				},
			],
		},
	};
}

export function writeHookToProject(projectPath: string, taskId: string): void {
	const claudeDir = join(projectPath, ".claude");
	const settingsPath = join(claudeDir, "settings.json");

	if (!existsSync(claudeDir)) {
		mkdirSync(claudeDir, { recursive: true });
	}

	let existingSettings: HookConfig = {};
	if (existsSync(settingsPath)) {
		try {
			const content = readFileSync(settingsPath, "utf-8");
			existingSettings = JSON.parse(content);
		} catch {
			existingSettings = {};
		}
	}

	const hookConfig = generateHookConfig(taskId);

	const merged: HookConfig = {
		...existingSettings,
		hooks: {
			...existingSettings.hooks,
			Stop: hookConfig.hooks?.Stop,
		},
	};

	writeFileSync(settingsPath, JSON.stringify(merged, null, 2));
}

export function removeHookFromProject(projectPath: string): void {
	const settingsPath = join(projectPath, ".claude", "settings.json");

	if (!existsSync(settingsPath)) {
		return;
	}

	try {
		const content = readFileSync(settingsPath, "utf-8");
		const settings: HookConfig = JSON.parse(content);

		if (settings.hooks?.Stop) {
			delete settings.hooks.Stop;
		}

		if (settings.hooks && Object.keys(settings.hooks).length === 0) {
			delete settings.hooks;
		}

		writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
	} catch {}
}
