import { spawnSync } from "node:child_process";
import type { Platform } from "../types/index.ts";

export function formatDuration(ms: number | null): string {
	if (!ms) return "-";
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

export function getPlatform(): Platform {
	const platform = process.platform;
	if (platform === "win32" || platform === "darwin" || platform === "linux") {
		return platform;
	}
	return "linux";
}

export interface ToolVerificationResult {
	ok: boolean;
	missing: string[];
	found: string[];
}

export function verifyTools(tools: string[]): ToolVerificationResult {
	const platform = getPlatform();
	const missing: string[] = [];
	const found: string[] = [];

	for (const tool of tools) {
		const cmd = platform === "win32" ? "where" : "which";
		const result = spawnSync(cmd, [tool], {
			encoding: "utf-8",
			stdio: "pipe",
		});

		if (result.status === 0) {
			found.push(tool);
		} else {
			missing.push(tool);
		}
	}

	return { ok: missing.length === 0, missing, found };
}

export function verifyRequiredTools(): ToolVerificationResult {
	return verifyTools(["git", "claude", "bun"]);
}

export function formatToolVerificationError(
	result: ToolVerificationResult,
): string {
	if (result.ok) return "";

	const lines = [
		"Missing required tools:",
		"",
		...result.missing.map((tool) => `  - ${tool}`),
		"",
		"Please install the missing tools and ensure they are in your PATH.",
	];

	const hints: Record<string, string> = {
		git: "Git: https://git-scm.com/downloads",
		claude: "Claude Code: npm install -g @anthropic-ai/claude-code",
		bun: "Bun: https://bun.sh",
	};

	const relevantHints = result.missing
		.filter((tool) => hints[tool])
		.map((tool) => `  ${hints[tool]}`);

	if (relevantHints.length > 0) {
		lines.push("", "Installation guides:", ...relevantHints);
	}

	return lines.join("\n");
}
