import { existsSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
	db,
	type Feature,
	features,
	type Project,
	projects,
	type Task,
	tasks,
} from "../db/index.ts";
import {
	commitAndPush,
	completeFeatureBranch,
	completeTaskBranch,
	completeWorkBranch,
	createFeatureBranch,
	createTaskBranchFromFeature,
	getCurrentBranch,
	setupWorkBranch,
} from "../lib/git.ts";
import { removeHookFromProject, writeHookToProject } from "../lib/hooks.ts";
import { launchTask } from "../lib/runner.ts";
import {
	getFeatureBranchName,
	getTaskBranchName,
	scanFeatures,
} from "../lib/tasks.ts";
import {
	formatToolVerificationError,
	verifyRequiredTools,
} from "../lib/utils.ts";

const api = new Hono();

api.get("/projects", async (c) => {
	const allProjects = db.select().from(projects).all();
	return c.json(allProjects);
});

api.get("/projects/:id", async (c) => {
	const { id } = c.req.param();

	const project = db.select().from(projects).where(eq(projects.id, id)).get();

	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}

	const projectFeatures = db
		.select()
		.from(features)
		.where(eq(features.projectId, id))
		.orderBy(features.number)
		.all();

	const featuresWithTasks = projectFeatures.map((feature) => {
		const featureTasks = db
			.select()
			.from(tasks)
			.where(eq(tasks.featureId, feature.id))
			.orderBy(tasks.number)
			.all();
		return { ...feature, tasks: featureTasks };
	});

	return c.json({ ...project, features: featuresWithTasks });
});

api.post("/projects", async (c) => {
	const body = await c.req.json();
	const { name, path, branchingMode, workBranch, autoCommit, autoPush } = body;

	if (!name || !path) {
		return c.json({ error: "name and path are required" }, 400);
	}

	const mode =
		(branchingMode as "branching" | "single-branch" | "disabled") ||
		"branching";

	let resolvedWorkBranch = workBranch || null;
	if (mode === "single-branch" && !resolvedWorkBranch) {
		try {
			resolvedWorkBranch = getCurrentBranch(path);
		} catch (error) {
			return c.json(
				{ error: "Failed to get current branch from project path" },
				400,
			);
		}
	}

	const id = nanoid();
	const newProject = {
		id,
		name,
		path,
		branchingMode: mode,
		workBranch: resolvedWorkBranch,
		autoCommit: mode === "disabled" ? false : autoCommit !== false,
		autoPush: mode === "disabled" ? false : autoPush !== false,
		status: "idle" as const,
		createdAt: new Date(),
	};

	db.insert(projects).values(newProject).run();

	return c.json(newProject, 201);
});

api.delete("/projects/:id", async (c) => {
	const { id } = c.req.param();

	const project = db.select().from(projects).where(eq(projects.id, id)).get();

	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}

	db.delete(projects).where(eq(projects.id, id)).run();

	return c.json({ success: true, deleted: id });
});

api.post("/projects/:id/scan", async (c) => {
	const { id } = c.req.param();

	const project = db.select().from(projects).where(eq(projects.id, id)).get();

	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}

	if (project.status === "running") {
		return c.json({ error: "Cannot scan while project is running" }, 400);
	}

	if (!existsSync(project.path)) {
		return c.json({ error: `Project path not found: ${project.path}` }, 400);
	}

	try {
		const scannedFeatures = scanFeatures(project.path);
		const scannedFolderNames = new Set(
			scannedFeatures.map((f) => f.folderName),
		);

		const existingFeatures = db
			.select()
			.from(features)
			.where(eq(features.projectId, id))
			.all();

		const stats = {
			featuresAdded: 0,
			featuresPreserved: 0,
			featuresRemoved: 0,
			tasksAdded: 0,
			tasksPreserved: 0,
			tasksRemoved: 0,
		};

		for (const existingFeature of existingFeatures) {
			if (
				existingFeature.status === "done" ||
				existingFeature.status === "failed"
			) {
				stats.featuresPreserved++;
				const featureTasks = db
					.select()
					.from(tasks)
					.where(eq(tasks.featureId, existingFeature.id))
					.all();
				stats.tasksPreserved += featureTasks.length;
				continue;
			}

			if (!scannedFolderNames.has(existingFeature.folderName)) {
				const featureTasks = db
					.select()
					.from(tasks)
					.where(eq(tasks.featureId, existingFeature.id))
					.all();
				stats.tasksRemoved += featureTasks.length;
				db.delete(features).where(eq(features.id, existingFeature.id)).run();
				stats.featuresRemoved++;
				continue;
			}

			const scannedFeature = scannedFeatures.find(
				(f) => f.folderName === existingFeature.folderName,
			);
			if (
				scannedFeature &&
				scannedFeature.context !== existingFeature.context
			) {
				db.update(features)
					.set({ context: scannedFeature.context })
					.where(eq(features.id, existingFeature.id))
					.run();
			}

			const existingTasks = db
				.select()
				.from(tasks)
				.where(eq(tasks.featureId, existingFeature.id))
				.all();

			const scannedTaskFilenames = new Set(
				scannedFeature?.tasks.map((t) => t.filename) ?? [],
			);

			for (const existingTask of existingTasks) {
				if (
					existingTask.status === "done" ||
					existingTask.status === "failed"
				) {
					stats.tasksPreserved++;
					continue;
				}

				if (!scannedTaskFilenames.has(existingTask.filename)) {
					db.delete(tasks).where(eq(tasks.id, existingTask.id)).run();
					stats.tasksRemoved++;
					continue;
				}

				stats.tasksPreserved++;
			}

			const existingTaskFilenames = new Set(
				existingTasks.map((t) => t.filename),
			);
			for (const scannedTask of scannedFeature?.tasks ?? []) {
				if (!existingTaskFilenames.has(scannedTask.filename)) {
					db.insert(tasks)
						.values({
							id: nanoid(),
							projectId: id,
							featureId: existingFeature.id,
							number: scannedTask.number,
							title: scannedTask.title,
							filename: scannedTask.filename,
							status: "pending",
						})
						.run();
					stats.tasksAdded++;
				}
			}

			stats.featuresPreserved++;
		}

		const existingFolderNames = new Set(
			existingFeatures.map((f) => f.folderName),
		);
		for (const scannedFeature of scannedFeatures) {
			if (existingFolderNames.has(scannedFeature.folderName)) {
				continue;
			}

			const featureId = nanoid();
			const branchName =
				project.branchingMode === "single-branch"
					? null
					: getFeatureBranchName(scannedFeature.name);

			db.insert(features)
				.values({
					id: featureId,
					projectId: id,
					number: scannedFeature.number,
					name: scannedFeature.name,
					folderName: scannedFeature.folderName,
					context: scannedFeature.context,
					branchName,
					status: "pending",
				})
				.run();
			stats.featuresAdded++;

			for (const scannedTask of scannedFeature.tasks) {
				db.insert(tasks)
					.values({
						id: nanoid(),
						projectId: id,
						featureId,
						number: scannedTask.number,
						title: scannedTask.title,
						filename: scannedTask.filename,
						status: "pending",
					})
					.run();
				stats.tasksAdded++;
			}
		}

		return c.json({
			success: true,
			...stats,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return c.json({ error: message }, 400);
	}
});

api.post("/projects/:id/start", async (c) => {
	const { id } = c.req.param();

	// Verify required tools are available before starting
	const toolCheck = verifyRequiredTools();
	if (!toolCheck.ok) {
		const errorMessage = formatToolVerificationError(toolCheck);
		console.error(errorMessage);
		return c.json(
			{
				error: "Missing required tools",
				missing: toolCheck.missing,
				details: errorMessage,
			},
			400,
		);
	}

	const project = db.select().from(projects).where(eq(projects.id, id)).get();

	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}

	if (project.status === "running") {
		return c.json({ error: "Project is already running" }, 400);
	}

	const firstFeature = db
		.select()
		.from(features)
		.where(and(eq(features.projectId, id), eq(features.status, "pending")))
		.orderBy(features.number)
		.get();

	if (!firstFeature) {
		return c.json({ error: "No pending features found" }, 400);
	}

	const firstTask = db
		.select()
		.from(tasks)
		.where(
			and(eq(tasks.featureId, firstFeature.id), eq(tasks.status, "pending")),
		)
		.orderBy(tasks.number)
		.get();

	if (!firstTask) {
		return c.json({ error: "No pending tasks in first feature" }, 400);
	}

	startFeatureAndTask(project.path, firstFeature, firstTask, project, true);

	db.update(projects)
		.set({
			status: "running",
			currentFeatureId: firstFeature.id,
			currentTaskId: firstTask.id,
		})
		.where(eq(projects.id, id))
		.run();

	return c.json({
		success: true,
		message: "Project started",
		currentFeature: firstFeature,
		currentTask: firstTask,
	});
});

api.post("/projects/:id/stop", async (c) => {
	const { id } = c.req.param();

	let body: { reason?: string } = {};
	try {
		body = await c.req.json();
	} catch {}

	const project = db.select().from(projects).where(eq(projects.id, id)).get();

	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}

	const isRateLimit = body.reason === "rate_limit";

	if (project.currentTaskId) {
		db.update(tasks)
			.set({ status: "failed", completedAt: new Date() })
			.where(eq(tasks.id, project.currentTaskId))
			.run();
	}

	if (project.currentFeatureId) {
		db.update(features)
			.set({ status: "failed", completedAt: new Date() })
			.where(eq(features.id, project.currentFeatureId))
			.run();
	}

	removeHookFromProject(project.path);

	db.update(projects)
		.set({
			status: isRateLimit ? "rate_limited" : "idle",
			currentFeatureId: null,
			currentTaskId: null,
		})
		.where(eq(projects.id, id))
		.run();

	console.log(
		`Project ${project.name} stopped${isRateLimit ? " (rate limited)" : ""}`,
	);

	return c.json({
		success: true,
		message: isRateLimit
			? "Project stopped due to rate limit"
			: "Project stopped",
		status: isRateLimit ? "rate_limited" : "idle",
	});
});

api.post("/tasks/:id/complete", async (c) => {
	const { id } = c.req.param();

	let body: { success?: boolean; rate_limited?: boolean } = {};
	try {
		body = await c.req.json();
	} catch {}

	const task = db.select().from(tasks).where(eq(tasks.id, id)).get();

	if (!task) {
		return c.json({ error: "Task not found" }, 404);
	}

	const feature = db
		.select()
		.from(features)
		.where(eq(features.id, task.featureId))
		.get();

	if (!feature) {
		return c.json({ error: "Feature not found" }, 404);
	}

	const project = db
		.select()
		.from(projects)
		.where(eq(projects.id, task.projectId))
		.get();

	if (!project) {
		return c.json({ error: "Project not found" }, 404);
	}

	if (body.rate_limited) {
		console.log("Rate limit detected! Stopping project...");

		db.update(tasks)
			.set({ status: "failed", completedAt: new Date() })
			.where(eq(tasks.id, id))
			.run();

		db.update(features)
			.set({ status: "failed", completedAt: new Date() })
			.where(eq(features.id, feature.id))
			.run();

		removeHookFromProject(project.path);

		db.update(projects)
			.set({
				status: "rate_limited",
				currentFeatureId: null,
				currentTaskId: null,
			})
			.where(eq(projects.id, project.id))
			.run();

		return c.json({
			success: false,
			error: "Rate limit detected - project stopped",
			projectStatus: "rate_limited",
		});
	}

	const now = new Date();
	const durationMs = task.startedAt
		? now.getTime() - task.startedAt.getTime()
		: null;

	const newStatus = body.success === false ? "failed" : "done";
	db.update(tasks)
		.set({
			status: newStatus,
			completedAt: now,
			durationMs,
		})
		.where(eq(tasks.id, id))
		.run();

	if (newStatus === "done" && project.autoCommit) {
		if (
			project.branchingMode === "branching" &&
			task.branchName &&
			feature.branchName
		) {
			try {
				await completeTaskBranch(
					project.path,
					task.branchName,
					feature.branchName,
					task.title,
					project.autoPush,
				);
			} catch (error) {
				console.error("Git operations failed:", error);
			}
		} else if (project.branchingMode === "single-branch") {
			try {
				await commitAndPush(
					project.path,
					`feat: complete ${task.title}`,
					project.autoPush,
				);
			} catch (error) {
				console.error("Commit/push failed:", error);
			}
		}
	}

	const nextTaskInFeature = db
		.select()
		.from(tasks)
		.where(and(eq(tasks.featureId, feature.id), eq(tasks.status, "pending")))
		.orderBy(tasks.number)
		.get();

	if (nextTaskInFeature) {
		startTask(project.path, feature, nextTaskInFeature, project);

		db.update(projects)
			.set({ currentTaskId: nextTaskInFeature.id })
			.where(eq(projects.id, project.id))
			.run();

		return c.json({
			success: true,
			completedTask: { id, status: newStatus, durationMs },
			nextTask: nextTaskInFeature,
			featureComplete: false,
			projectComplete: false,
		});
	}

	const featureNow = new Date();
	const featureDurationMs = feature.startedAt
		? featureNow.getTime() - feature.startedAt.getTime()
		: null;

	db.update(features)
		.set({
			status: "done",
			completedAt: featureNow,
			durationMs: featureDurationMs,
		})
		.where(eq(features.id, feature.id))
		.run();

	if (
		project.autoCommit &&
		project.branchingMode === "branching" &&
		feature.branchName
	) {
		try {
			await completeFeatureBranch(
				project.path,
				feature.branchName,
				feature.name,
				project.autoPush,
			);
		} catch (error) {
			console.error("Feature branch merge failed:", error);
		}
	}

	const nextFeature = db
		.select()
		.from(features)
		.where(
			and(eq(features.projectId, project.id), eq(features.status, "pending")),
		)
		.orderBy(features.number)
		.get();

	if (nextFeature) {
		const firstTaskOfNextFeature = db
			.select()
			.from(tasks)
			.where(
				and(eq(tasks.featureId, nextFeature.id), eq(tasks.status, "pending")),
			)
			.orderBy(tasks.number)
			.get();

		if (firstTaskOfNextFeature) {
			startFeatureAndTask(
				project.path,
				nextFeature,
				firstTaskOfNextFeature,
				project,
				false,
			);

			db.update(projects)
				.set({
					currentFeatureId: nextFeature.id,
					currentTaskId: firstTaskOfNextFeature.id,
				})
				.where(eq(projects.id, project.id))
				.run();

			return c.json({
				success: true,
				completedTask: { id, status: newStatus, durationMs },
				completedFeature: { id: feature.id, name: feature.name },
				nextFeature,
				nextTask: firstTaskOfNextFeature,
				featureComplete: true,
				projectComplete: false,
			});
		}
	}

	if (
		project.autoCommit &&
		project.branchingMode === "single-branch" &&
		project.workBranch
	) {
		try {
			await completeWorkBranch(
				project.path,
				project.workBranch,
				project.autoPush,
			);
		} catch (error) {
			console.error("Work branch merge failed:", error);
		}
	}

	removeHookFromProject(project.path);

	db.update(projects)
		.set({ status: "done", currentFeatureId: null, currentTaskId: null })
		.where(eq(projects.id, project.id))
		.run();

	return c.json({
		success: true,
		completedTask: { id, status: newStatus, durationMs },
		completedFeature: { id: feature.id, name: feature.name },
		nextFeature: null,
		nextTask: null,
		featureComplete: true,
		projectComplete: true,
	});
});

function startFeatureAndTask(
	projectPath: string,
	feature: Feature,
	task: Task,
	project: Project,
	isFirstFeature: boolean,
): void {
	if (project.autoCommit) {
		if (project.branchingMode === "branching") {
			try {
				createFeatureBranch(projectPath, feature.branchName!);
			} catch (error) {
				console.error("Failed to create feature branch:", error);
			}
		} else if (
			project.branchingMode === "single-branch" &&
			project.workBranch &&
			isFirstFeature
		) {
			try {
				setupWorkBranch(projectPath, project.workBranch);
			} catch (error) {
				console.error("Failed to setup work branch:", error);
			}
		}
	}

	db.update(features)
		.set({
			status: "running",
			startedAt: new Date(),
		})
		.where(eq(features.id, feature.id))
		.run();

	startTask(projectPath, feature, task, project);
}

function startTask(
	projectPath: string,
	feature: Feature,
	task: Task,
	project: Project,
): void {
	let taskBranchName: string | null = null;

	if (
		project.autoCommit &&
		project.branchingMode === "branching" &&
		feature.branchName
	) {
		taskBranchName = getTaskBranchName(feature.number, task.number, task.title);
		try {
			createTaskBranchFromFeature(
				projectPath,
				feature.branchName,
				taskBranchName,
			);
		} catch (error) {
			console.error("Failed to create task branch:", error);
		}
	}

	db.update(tasks)
		.set({
			status: "running",
			startedAt: new Date(),
			branchName: taskBranchName,
		})
		.where(eq(tasks.id, task.id))
		.run();

	writeHookToProject(projectPath, task.id);

	launchTask(projectPath, feature.folderName, task.filename, feature.context);
}

export default api;
