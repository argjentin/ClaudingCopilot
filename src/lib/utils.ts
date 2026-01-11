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
