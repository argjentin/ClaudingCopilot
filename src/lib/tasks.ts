import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ScannedFeature, ScannedTask } from "../types/index.ts";

export type { ScannedFeature, ScannedTask } from "../types/index.ts";

export function scanFeatures(projectPath: string): ScannedFeature[] {
	const tasksDir = join(projectPath, "tasks");

	if (!existsSync(tasksDir)) {
		throw new Error(`Tasks directory not found: ${tasksDir}`);
	}

	const entries = readdirSync(tasksDir, { withFileTypes: true });
	const features: ScannedFeature[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const parsed = parseFeatureFolderName(entry.name);
		if (!parsed) continue;

		const featurePath = join(tasksDir, entry.name);
		const context = readFeatureContext(featurePath);
		const tasks = scanTaskFiles(featurePath);

		features.push({
			number: parsed.number,
			name: parsed.name,
			folderName: entry.name,
			context,
			tasks,
		});
	}

	return features.sort((a, b) => a.number - b.number);
}

function parseFeatureFolderName(
	folderName: string,
): { number: number; name: string } | null {
	const match = folderName.match(/^(\d+)_tasks_(.+)$/);

	if (!match) {
		return null;
	}

	const number = parseInt(match[1]!, 10);
	const name = match[2]!.replace(/_/g, "-");

	return { number, name };
}

function readFeatureContext(featurePath: string): string | null {
	const readmePath = join(featurePath, "README.md");

	if (!existsSync(readmePath)) {
		return null;
	}

	try {
		return readFileSync(readmePath, "utf-8");
	} catch {
		return null;
	}
}

export function scanTaskFiles(folderPath: string): ScannedTask[] {
	if (!existsSync(folderPath)) {
		return [];
	}

	const files = readdirSync(folderPath).filter(
		(f) => f.endsWith(".md") && f !== "README.md",
	);

	const tasks: ScannedTask[] = [];

	for (const filename of files) {
		const parsed = parseTaskFilename(filename);
		if (parsed) {
			tasks.push({
				number: parsed.number,
				title: parsed.title,
				filename,
			});
		}
	}

	return tasks.sort((a, b) => a.number - b.number);
}

function parseTaskFilename(
	filename: string,
): { number: number; title: string } | null {
	const match = filename.match(/^(\d+)-(.+)\.md$/);

	if (!match) {
		return null;
	}

	const number = parseInt(match[1]!, 10);
	const title = match[2]!.replace(/-/g, " ");

	return { number, title };
}

export function getFeatureBranchName(featureName: string): string {
	return `feature/${featureName}`;
}

export function getTaskBranchName(
	featureNumber: number,
	taskNumber: number,
	taskTitle: string,
): string {
	const slug = taskTitle.replace(/\s+/g, "-").toLowerCase();
	return `task-${String(featureNumber).padStart(2, "0")}-${String(taskNumber).padStart(2, "0")}-${slug}`;
}
