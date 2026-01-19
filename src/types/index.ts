import type { Feature, Project, Task } from "../db/schema.ts";

export type {
	Feature,
	NewFeature,
	NewProject,
	NewTask,
	Project,
	Task,
} from "../db/schema.ts";

export type Platform = "win32" | "darwin" | "linux";

export type ProjectStatus = "idle" | "running" | "done" | "rate_limited";
export type FeatureStatus = "pending" | "running" | "done" | "failed";
export type TaskStatus = "pending" | "running" | "done" | "failed";
export type BranchingMode = "branching" | "single-branch";

export interface FeatureWithTasks extends Feature {
	tasks: Task[];
}

export interface TaskCounts {
	total: number;
	pending: number;
	running: number;
	done: number;
	failed: number;
	features?: number;
}

export interface ProjectWithStats extends Project {
	taskCounts: TaskCounts;
}

export interface ScannedTask {
	number: number;
	title: string;
	filename: string;
}

export interface ScannedFeature {
	number: number;
	name: string;
	folderName: string;
	context: string | null;
	tasks: ScannedTask[];
}

export interface HookConfig {
	hooks?: {
		// Stop hook doesn't use matcher
		Stop?: Array<{
			hooks: Array<{
				type: string;
				command: string;
			}>;
		}>;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}
