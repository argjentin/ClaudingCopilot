import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { HookConfig } from "../types/index.ts";
import { config } from "./config.ts";
import { getPlatform } from "./utils.ts";

function generateWindowsStopScript(taskId: string): string {
	return `powershell -NoProfile -Command "$hookData = $input | ConvertFrom-Json; $transcriptPath = $hookData.transcript_path; $rateLimit = $false; if ($transcriptPath -and (Test-Path $transcriptPath)) { $content = Get-Content $transcriptPath -Raw; if ($content -match 'usage limit reached|rate_limit_error') { $rateLimit = $true } }; $body = @{rate_limited=$rateLimit} | ConvertTo-Json; Invoke-RestMethod -Uri '${config.apiBaseUrl}/api/tasks/${taskId}/complete' -Method POST -Body $body -ContentType 'application/json' -ErrorAction SilentlyContinue"`;
}

function generateUnixStopScript(taskId: string): string {
	return `bash -c 'read input; transcript_path=$(echo "$input" | jq -r ".transcript_path // empty"); rate_limited=false; if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then if grep -qE "usage limit reached|rate_limit_error" "$transcript_path"; then rate_limited=true; fi; fi; curl -s -X POST -H "Content-Type: application/json" -d "{\\"rate_limited\\":$rate_limited}" "${config.apiBaseUrl}/api/tasks/${taskId}/complete" > /dev/null 2>&1'`;
}

function generateStopScript(taskId: string): string {
	const platform = getPlatform();
	if (platform === "win32") {
		return generateWindowsStopScript(taskId);
	}
	return generateUnixStopScript(taskId);
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
	} catch {
		// Ignore errors
	}
}
