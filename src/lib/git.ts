import { spawnSync } from "node:child_process";
import { config } from "./config.ts";

const MAX_PUSH_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function git(projectPath: string, ...args: string[]): string {
	const result = spawnSync("git", args, {
		cwd: projectPath,
		encoding: "utf-8",
		shell: true,
	});

	if (result.error) {
		console.error(`Git error: ${result.error.message}`);
		throw result.error;
	}

	if (result.status !== 0) {
		const errorMsg = result.stderr || result.stdout || "Unknown git error";
		console.error(`Git failed (${result.status}): ${errorMsg}`);
		throw new Error(errorMsg);
	}

	return result.stdout.trim();
}

export function createBranch(projectPath: string, branchName: string): void {
	try {
		git(projectPath, "checkout", "-b", branchName);
		console.log(`Created and switched to branch: ${branchName}`);
	} catch (error) {
		try {
			git(projectPath, "checkout", branchName);
			console.log(`Switched to existing branch: ${branchName}`);
		} catch {
			console.error(`Failed to create/switch to branch: ${branchName}`);
			throw error;
		}
	}
}

export function createBranchIfNotExists(
	projectPath: string,
	branchName: string,
): void {
	try {
		git(projectPath, "checkout", "-b", branchName);
		console.log(`Created and switched to branch: ${branchName}`);
	} catch {
		git(projectPath, "checkout", branchName);
		console.log(`Switched to existing branch: ${branchName}`);
	}
}

export function checkoutBranch(projectPath: string, branchName: string): void {
	try {
		git(projectPath, "checkout", branchName);
		console.log(`Switched to branch: ${branchName}`);
	} catch (error) {
		console.error(`Failed to checkout branch: ${branchName}`);
		throw error;
	}
}

export function commitAll(projectPath: string, message: string): void {
	try {
		git(projectPath, "add", "-A");
		git(projectPath, "commit", "-m", `"${message}"`);
		console.log(`Committed: ${message}`);
	} catch (_error) {
		console.log("Nothing to commit or commit failed");
	}
}

export function checkoutMain(projectPath: string): string {
	try {
		git(projectPath, "checkout", config.gitMainBranch);
		return config.gitMainBranch;
	} catch {
		console.error(`Could not checkout ${config.gitMainBranch} branch`);
		throw new Error(`Branch ${config.gitMainBranch} not found`);
	}
}

export function pull(projectPath: string): void {
	try {
		git(projectPath, "pull", "origin", config.gitMainBranch);
		console.log(`Pulled latest changes from origin/${config.gitMainBranch}`);
	} catch (error) {
		console.error("Failed to pull:", error);
	}
}

export function pullBranch(projectPath: string, branchName: string): void {
	try {
		if (branchExistsRemote(projectPath, branchName)) {
			git(projectPath, "pull", "origin", branchName);
			console.log(`Pulled latest changes from origin/${branchName}`);
		} else {
			console.log(
				`Branch ${branchName} does not exist on remote, skipping pull`,
			);
		}
	} catch (_error) {
		console.log(`Pull failed for ${branchName}, continuing anyway`);
	}
}

export function branchExistsRemote(
	projectPath: string,
	branchName: string,
): boolean {
	try {
		const result = git(
			projectPath,
			"ls-remote",
			"--heads",
			"origin",
			branchName,
		);
		return result.length > 0;
	} catch {
		return false;
	}
}

export function mergeBranch(
	projectPath: string,
	branchName: string,
	message?: string,
): void {
	try {
		if (message) {
			git(projectPath, "merge", "--no-ff", branchName, "-m", `"${message}"`);
		} else {
			git(projectPath, "merge", branchName, "--no-edit");
		}
		console.log(`Merged branch: ${branchName}`);
	} catch (error) {
		console.error(`Failed to merge branch: ${branchName}`);
		throw error;
	}
}

export async function push(
	projectPath: string,
	retries = MAX_PUSH_RETRIES,
): Promise<void> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			git(projectPath, "push", "-u", "origin", "HEAD");
			console.log("Push successful");
			return;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);

			if (errorMsg.includes("Failed to authenticate") && attempt < retries) {
				console.log(`Push failed (attempt ${attempt}/${retries}), retrying...`);
				await sleep(RETRY_DELAY_MS);
				continue;
			}

			if (attempt === retries) {
				console.error(`Push failed after ${retries} attempts`);
				throw error;
			}
		}
	}
}

export function deleteBranchLocal(
	projectPath: string,
	branchName: string,
): void {
	try {
		git(projectPath, "branch", "-d", branchName);
		console.log(`Deleted local branch: ${branchName}`);
	} catch (_error) {
		try {
			git(projectPath, "branch", "-D", branchName);
			console.log(`Force deleted local branch: ${branchName}`);
		} catch {
			console.log(`Could not delete local branch: ${branchName}`);
		}
	}
}

export function deleteBranchRemote(
	projectPath: string,
	branchName: string,
): void {
	try {
		git(projectPath, "push", "origin", "--delete", branchName);
		console.log(`Deleted remote branch: origin/${branchName}`);
	} catch (_error) {
		console.log(
			`Could not delete remote branch: ${branchName} (may not exist)`,
		);
	}
}

export function deleteBranch(projectPath: string, branchName: string): void {
	deleteBranchRemote(projectPath, branchName);
	deleteBranchLocal(projectPath, branchName);
}

export async function commitAndPush(
	projectPath: string,
	message: string,
	autoPush = true,
): Promise<void> {
	commitAll(projectPath, message);
	if (autoPush) {
		await push(projectPath);
	}
}

export function createFeatureBranch(
	projectPath: string,
	featureBranchName: string,
): void {
	checkoutMain(projectPath);
	pull(projectPath);
	createBranch(projectPath, featureBranchName);
	console.log(`Created feature branch: ${featureBranchName}`);
}

export function createTaskBranchFromFeature(
	projectPath: string,
	featureBranchName: string,
	taskBranchName: string,
): void {
	checkoutBranch(projectPath, featureBranchName);
	createBranch(projectPath, taskBranchName);
	console.log(
		`Created task branch: ${taskBranchName} from ${featureBranchName}`,
	);
}

export async function completeTaskBranch(
	projectPath: string,
	taskBranchName: string,
	featureBranchName: string,
	taskTitle: string,
	autoPush = true,
): Promise<void> {
	try {
		commitAll(projectPath, `feat: complete ${taskTitle}`);

		if (autoPush) {
			await push(projectPath);
		}

		checkoutBranch(projectPath, featureBranchName);

		pullBranch(projectPath, featureBranchName);

		mergeBranch(
			projectPath,
			taskBranchName,
			`Merge task '${taskTitle}' into ${featureBranchName}`,
		);

		if (autoPush) {
			await push(projectPath);
		}

		deleteBranch(projectPath, taskBranchName);

		console.log(
			`Task branch ${taskBranchName} merged to ${featureBranchName} and deleted`,
		);
	} catch (error) {
		console.error(`Failed to complete task branch: ${taskBranchName}`, error);
		throw error;
	}
}

export async function completeFeatureBranch(
	projectPath: string,
	featureBranchName: string,
	featureName: string,
	autoPush = true,
): Promise<void> {
	try {
		checkoutMain(projectPath);

		pull(projectPath);

		mergeBranch(
			projectPath,
			featureBranchName,
			`Merge feature '${featureName}' into ${config.gitMainBranch}`,
		);

		if (autoPush) {
			await push(projectPath);
		}

		deleteBranch(projectPath, featureBranchName);

		console.log(
			`Feature branch ${featureBranchName} merged to ${config.gitMainBranch} and deleted`,
		);
	} catch (error) {
		console.error(
			`Failed to complete feature branch: ${featureBranchName}`,
			error,
		);
		throw error;
	}
}

export function setupWorkBranch(
	projectPath: string,
	workBranchName: string,
): void {
	checkoutMain(projectPath);
	pull(projectPath);
	createBranchIfNotExists(projectPath, workBranchName);
	console.log(
		`Work branch ${workBranchName} ready (based on ${config.gitMainBranch})`,
	);
}

export async function completeWorkBranch(
	projectPath: string,
	workBranchName: string,
	autoPush = true,
): Promise<void> {
	try {
		commitAll(projectPath, `wip: final sync before merge`);

		if (autoPush) {
			await push(projectPath);
		}

		checkoutMain(projectPath);

		pull(projectPath);

		mergeBranch(
			projectPath,
			workBranchName,
			`Merge work branch '${workBranchName}' into ${config.gitMainBranch}`,
		);

		if (autoPush) {
			await push(projectPath);
		}

		deleteBranch(projectPath, workBranchName);

		console.log(
			`Work branch ${workBranchName} merged to ${config.gitMainBranch} and deleted`,
		);
	} catch (error) {
		console.error(`Failed to complete work branch: ${workBranchName}`, error);
		throw error;
	}
}
