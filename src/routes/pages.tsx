import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { nanoid } from "nanoid";
import { FeatureSection } from "../components/FeatureSection.tsx";
import { Layout } from "../components/Layout.tsx";
import { ProjectCard } from "../components/ProjectCard.tsx";
import { ProjectStats } from "../components/ProjectStats.tsx";
import { db, features, projects, tasks } from "../db/index.ts";
import { flash, getFlash } from "../lib/flash.ts";

const pages = new Hono();

pages.get("/", (c) => {
	const flashMessage = getFlash(c);
	const allProjects = db
		.select()
		.from(projects)
		.orderBy(projects.createdAt)
		.all();

	const projectsWithCounts = allProjects.map((project) => {
		const projectTasks = db
			.select()
			.from(tasks)
			.where(eq(tasks.projectId, project.id))
			.all();

		const projectFeatures = db
			.select()
			.from(features)
			.where(eq(features.projectId, project.id))
			.all();

		const counts = {
			total: projectTasks.length,
			pending: projectTasks.filter((t) => t.status === "pending").length,
			running: projectTasks.filter((t) => t.status === "running").length,
			done: projectTasks.filter((t) => t.status === "done").length,
			failed: projectTasks.filter((t) => t.status === "failed").length,
			features: projectFeatures.length,
		};

		return { project, counts };
	});

	return c.html(
		<Layout flash={flashMessage}>
			<div class="page-header">
				<div class="page-header-row">
					<div>
						<div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
							<span style="color: var(--claude-copper-dark); font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em;">
								Dashboard
							</span>
							<div style="height: 1px; width: 100px; background: var(--border-subtle);"></div>
						</div>
						<h1 class="page-title">Orchestrator Overview</h1>
					</div>
				</div>
				<p class="page-subtitle">
					<svg
						width="16"
						height="16"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
					{projectsWithCounts.length} projects registered
				</p>
			</div>

			<div class="grid grid-2">
				{projectsWithCounts.length === 0 ? (
					<div
						class="glass-card-static empty-state"
						style="grid-column: 1 / -1;"
					>
						<div class="empty-state-icon">
							<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
								/>
							</svg>
						</div>
						<p style="margin-bottom: 1.5rem;">
							No projects yet. Create your first project to get started!
						</p>
						<a href="/projects/new" class="btn btn-primary">
							<svg
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							New Project
						</a>
					</div>
				) : (
					projectsWithCounts.map(({ project, counts }) => (
						<ProjectCard project={project} taskCounts={counts} />
					))
				)}
			</div>
		</Layout>,
	);
});

pages.get("/projects/new", (c) => {
	const flashMessage = getFlash(c);
	return c.html(
		<Layout title="New Project" flash={flashMessage}>
			<div class="page-header">
				<div class="page-header-row">
					<div>
						<div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
							<span style="color: var(--claude-copper-dark); font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em;">
								New Project
							</span>
							<div style="height: 1px; width: 100px; background: var(--border-subtle);"></div>
						</div>
						<h1 class="page-title">Onboard New Repository</h1>
					</div>
					<a href="/" class="btn btn-secondary">
						<svg
							width="16"
							height="16"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Dashboard
					</a>
				</div>
				<p class="page-subtitle">
					Initialize a new orchestration environment. Place your features in{" "}
					<code style="color: var(--claude-copper-dark);">
						/tasks/XX_tasks_name/
					</code>{" "}
					directories.
				</p>
			</div>

			<div class="glass-card-static" style="padding: 2rem;">
				<form
					id="create-project-form"
					onsubmit="event.preventDefault(); submitForm(this, { url: '/api/projects', successMessage: 'Project created!', loadingText: 'Creating...', onSuccess: function(data) { location.href = '/projects/' + data.id; } });"
				>
					<div class="form-group">
						<label class="form-label" for="name">
							Project Name
						</label>
						<input
							type="text"
							id="name"
							name="name"
							class="form-input"
							placeholder="my-awesome-project"
							required
						/>
					</div>

					<div class="form-group">
						<label class="form-label" for="path">
							Local Repository Path
						</label>
						<div style="position: relative;">
							<div style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-dimmed);">
								<svg
									width="16"
									height="16"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
									/>
								</svg>
							</div>
							<input
								type="text"
								id="path"
								name="path"
								class="form-input"
								style="padding-left: 2.75rem;"
								placeholder={
									process.platform === "win32"
										? "C:/Users/you/projects/my-project"
										: process.platform === "darwin"
											? "/Users/you/projects/my-project"
											: "/home/you/projects/my-project"
								}
								required
							/>
						</div>
						<p class="form-hint">
							Absolute path to the project folder containing a /tasks directory
						</p>
					</div>

					<div style="padding: 1.25rem; background: rgba(196, 167, 125, 0.05); border: 1px solid rgba(196, 167, 125, 0.25); border-radius: 12px; margin-bottom: 1.5rem;">
						<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
							<svg
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								style="color: var(--claude-copper-dark);"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							<span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--claude-copper-dark);">
								Git Configuration
							</span>
						</div>

						<div class="form-group" style="margin-bottom: 1rem;">
							<label
								class="form-label"
								style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; margin-bottom: 0.25rem;"
							>
								<input
									type="checkbox"
									id="autoCommit"
									name="autoCommit"
									checked
									onchange="toggleGitOptions()"
									style="width: 18px; height: 18px; accent-color: var(--claude-copper-dark); cursor: pointer;"
								/>
								<span style="font-weight: 600;">Automatic Git Management</span>
							</label>
							<p class="form-hint" style="margin-left: 2rem; margin-bottom: 0;">
								ClaudingCopilot manages branches, commits and merges.{" "}
								<strong>Disable = no git operations</strong>, you handle
								everything manually.
							</p>
						</div>

						<div id="gitOptionsGroup">
							<div
								class="form-group"
								style="margin-bottom: 1rem; padding-left: 2rem; border-left: 2px solid rgba(196, 167, 125, 0.3);"
							>
								<label
									class="form-label"
									for="branchingMode"
									style="font-size: 0.8rem;"
								>
									Branch Mode
								</label>
								<select
									id="branchingMode"
									name="branchingMode"
									class="form-input"
									onchange="toggleWorkBranch(this.value)"
									style="font-size: 0.85rem;"
								>
									<option value="branching">
										Feature/task branches (recommended)
									</option>
									<option value="single-branch">Single branch</option>
								</select>
								<p class="form-hint" style="font-size: 0.7rem;">
									<strong>Branches:</strong> main → feature/X → task-XX → merge
									back
									<br />
									<strong>Single:</strong> all on one branch (workBranch or
									current)
								</p>
							</div>

							<div
								id="workBranchGroup"
								class="form-group"
								style="display: none; margin-bottom: 1rem; padding-left: 2rem; border-left: 2px solid rgba(196, 167, 125, 0.3);"
							>
								<label
									class="form-label"
									for="workBranch"
									style="font-size: 0.8rem;"
								>
									Work Branch
								</label>
								<input
									type="text"
									id="workBranch"
									name="workBranch"
									class="form-input"
									placeholder="dev, develop, feature/my-feature..."
									style="font-size: 0.85rem;"
								/>
								<p class="form-hint" style="font-size: 0.7rem;">
									Target branch for commits. Empty = current branch.
								</p>
							</div>

							<div
								class="form-group"
								style="margin-bottom: 0; padding-left: 2rem; border-left: 2px solid rgba(196, 167, 125, 0.3);"
							>
								<label
									class="form-label"
									style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; margin-bottom: 0.25rem;"
								>
									<input
										type="checkbox"
										id="autoPush"
										name="autoPush"
										checked
										style="width: 16px; height: 16px; accent-color: var(--claude-copper-dark); cursor: pointer;"
									/>
									<span style="font-size: 0.85rem;">Automatic Push</span>
								</label>
								<p
									class="form-hint"
									style="margin-left: 1.75rem; margin-bottom: 0; font-size: 0.7rem;"
								>
									Push to remote after each commit/merge.{" "}
									<strong>Disable = local only</strong>, you push manually.
								</p>
							</div>
						</div>

						<div
							id="manualModeInfo"
							style="display: none; margin-top: 1rem; padding: 0.75rem; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 8px;"
						>
							<p style="margin: 0; font-size: 0.75rem; color: rgb(251, 191, 36);">
								<strong>Manual mode:</strong> ClaudingCopilot executes tasks
								sequentially but doesn't touch git. You manage commits, branches
								and push yourself.
							</p>
						</div>
					</div>

					<div style="padding: 1rem; background: rgba(196, 167, 125, 0.08); border: 1px solid rgba(196, 167, 125, 0.15); border-radius: 8px; margin-bottom: 1.5rem; overflow: hidden;">
						<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
							<svg
								width="14"
								height="14"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								style="color: var(--claude-copper-dark);"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span style="font-size: 0.625rem; font-weight: 700; text-transform: uppercase; color: var(--claude-copper-dark);">
								Structure
							</span>
						</div>
						<div style="overflow-x: auto;">
							<pre style="font-size: 0.7rem; color: var(--claude-copper-dark); line-height: 1.5; margin: 0; font-family: monospace; white-space: pre;">{`tasks/
├── 01_tasks_auth/
│   ├── README.md
│   ├── 01-setup.md
│   └── 02-login.md
└── 02_tasks_payment/
    ├── README.md
    └── 01-stripe.md`}</pre>
						</div>
					</div>

					<div class="actions">
						<button type="submit" class="btn btn-primary">
							<svg
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Create Project
						</button>
						<a href="/" class="btn btn-secondary">
							Cancel
						</a>
					</div>
				</form>
			</div>
			<script
				dangerouslySetInnerHTML={{
					__html: `
function toggleWorkBranch(mode) {
  var group = document.getElementById('workBranchGroup');
  group.style.display = mode === 'single-branch' ? 'block' : 'none';
}

function toggleGitOptions() {
  var autoCommit = document.getElementById('autoCommit').checked;
  var autoPush = document.getElementById('autoPush');
  var gitOptions = document.getElementById('gitOptionsGroup');
  var manualInfo = document.getElementById('manualModeInfo');

  gitOptions.style.display = autoCommit ? 'block' : 'none';
  manualInfo.style.display = autoCommit ? 'none' : 'block';

  // When disabling autoCommit, also disable autoPush for consistency
  if (!autoCommit) {
    autoPush.checked = false;
  }
}
`,
				}}
			/>
		</Layout>,
	);
});

pages.post("/projects/new", async (c) => {
	const body = await c.req.parseBody();
	const name = body.name as string;
	const path = body.path as string;
	const branchingMode = (body.branchingMode as string) || "branching";
	const workBranch = body.workBranch as string;
	const autoCommit = body.autoCommit === "on";
	const autoPush = body.autoPush === "on";

	if (!name || !path) {
		return c.html(
			<Layout title="Error">
				<div class="glass-card-static empty-state">
					<p style="color: var(--fail-red); margin-bottom: 1rem;">
						Name and path are required.
					</p>
					<a href="/projects/new" class="btn btn-secondary">
						Try again
					</a>
				</div>
			</Layout>,
			400,
		);
	}

	const id = nanoid();
	const newProject = {
		id,
		name,
		path,
		branchingMode: branchingMode as "branching" | "single-branch",
		workBranch: workBranch || null,
		autoCommit,
		autoPush,
		status: "idle" as const,
		createdAt: new Date(),
	};

	db.insert(projects).values(newProject).run();

	flash.success(c, `Project "${name}" created successfully!`);
	return c.redirect(`/projects/${id}`);
});

pages.get("/projects/:id", (c) => {
	const flashMessage = getFlash(c);
	const { id } = c.req.param();

	const project = db.select().from(projects).where(eq(projects.id, id)).get();

	if (!project) {
		return c.html(
			<Layout title="Not Found">
				<div class="glass-card-static empty-state">
					<div class="empty-state-icon">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<p style="margin-bottom: 1.5rem;">Project not found.</p>
					<a href="/" class="btn btn-secondary">
						Back to Dashboard
					</a>
				</div>
			</Layout>,
			404,
		);
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

	const allTasks = featuresWithTasks.flatMap((f) => f.tasks);
	const statusBadgeClass = `badge badge-${project.status}`;

	const totalFeatures = featuresWithTasks.length;
	const doneFeatures = featuresWithTasks.filter(
		(f) => f.status === "done",
	).length;
	const hasPendingFeatures = featuresWithTasks.some(
		(f) => f.status === "pending",
	);

	return c.html(
		<Layout title={project.name} autoRefresh={60} flash={flashMessage}>
			<div class="page-header">
				<div class="page-header-row">
					<div>
						<div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
							<a
								href="/"
								style="color: var(--claude-copper-dark); font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; text-decoration: none;"
							>
								<svg
									width="12"
									height="12"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									style="margin-right: 0.25rem; vertical-align: -2px;"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 19l-7-7 7-7"
									/>
								</svg>
								Dashboard
							</a>
							<div style="height: 1px; width: 50px; background: var(--border-subtle);"></div>
						</div>
						<div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
							<h1 class="page-title">{project.name}</h1>
							<span class={statusBadgeClass}>{project.status}</span>
							{!project.autoCommit ? (
								<span
									class="badge"
									style="background: rgba(251, 191, 36, 0.1); color: rgb(251, 191, 36); border: 1px solid rgba(251, 191, 36, 0.2);"
								>
									manual git
								</span>
							) : (
								<>
									{project.branchingMode === "single-branch" ? (
										<span
											class="badge"
											style="background: rgba(59, 130, 246, 0.1); color: rgb(96, 165, 250); border: 1px solid rgba(59, 130, 246, 0.2);"
										>
											single branch
											{project.workBranch ? `: ${project.workBranch}` : ""}
										</span>
									) : (
										<span
											class="badge"
											style="background: rgba(196, 167, 125, 0.15); color: var(--claude-copper); border: 1px solid rgba(196, 167, 125, 0.3);"
										>
											branches
										</span>
									)}
									{!project.autoPush && (
										<span
											class="badge"
											style="background: rgba(251, 191, 36, 0.1); color: rgb(251, 191, 36); border: 1px solid rgba(251, 191, 36, 0.2);"
										>
											local
										</span>
									)}
								</>
							)}
						</div>
					</div>
					<button
						type="button"
						class="btn btn-danger"
						onclick={`if(confirm('Delete this project and all its ${totalFeatures} features? This cannot be undone.')) { apiAction('/api/projects/${id}', { method: 'DELETE', button: this, loadingText: 'Deleting...', successMessage: 'Project deleted', redirect: '/' }); }`}
					>
						<svg
							width="16"
							height="16"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
						Delete
					</button>
				</div>
				<p class="page-subtitle">
					<svg
						width="14"
						height="14"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
						/>
					</svg>
					{project.path}
				</p>
			</div>

			<ProjectStats tasks={allTasks} />

			<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
				<div style="display: flex; align-items: center; gap: 0.5rem;">
					<span style="font-size: 0.875rem; color: var(--text-muted);">
						{totalFeatures} features
					</span>
					<span style="color: var(--text-dimmed);">·</span>
					<span style="font-size: 0.875rem; color: var(--text-muted);">
						{allTasks.length} tasks
					</span>
					{doneFeatures > 0 && (
						<>
							<span style="color: var(--text-dimmed);">·</span>
							<span style="font-size: 0.875rem; color: var(--success-glow);">
								{doneFeatures}/{totalFeatures} complete
							</span>
						</>
					)}
				</div>

				<div class="actions" style="margin: 0;">
					<button
						type="button"
						class="btn btn-secondary"
						onclick={`apiAction('/api/projects/${id}/scan', { button: this, loadingText: 'Scanning...', successMessage: 'Scan complete!', refresh: true, onSuccess: function(data) { var msg = 'Added: ' + data.featuresAdded + ' features, ' + data.tasksAdded + ' tasks. Preserved: ' + data.featuresPreserved + ' features, ' + data.tasksPreserved + ' tasks.'; showToast(msg, 'info'); } })`}
					>
						<svg
							width="16"
							height="16"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						Scan Features
					</button>
					{project.status === "idle" && hasPendingFeatures && (
						<button
							type="button"
							class="btn btn-success"
							onclick={`apiAction('/api/projects/${id}/start', { button: this, loadingText: 'Starting...', successMessage: 'Project started!', refresh: true })`}
						>
							<svg
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Start Execution
						</button>
					)}
					{project.status === "running" && (
						<button
							type="button"
							class="btn btn-danger"
							onclick={`apiAction('/api/projects/${id}/stop', { button: this, loadingText: 'Stopping...', successMessage: 'Project stopped', refresh: true })`}
						>
							<svg
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
								/>
							</svg>
							Stop Execution
						</button>
					)}
					{project.status === "rate_limited" && (
						<span class="btn btn-warning" style="cursor: default;">
							<svg
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
							Rate Limited
						</span>
					)}
				</div>
			</div>

			{featuresWithTasks.length === 0 ? (
				<div class="glass-card-static empty-state">
					<div class="empty-state-icon">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<p style="margin-bottom: 1rem;">
						No features found. Click "Scan Features" to import from the
						project's /tasks folder.
					</p>
					<p style="font-size: 0.75rem; color: var(--text-dimmed);">
						Expected structure:{" "}
						<code style="color: var(--claude-copper-dark);">
							tasks/01_tasks_feature_name/01-task.md
						</code>
					</p>
				</div>
			) : (
				featuresWithTasks.map((feature) => (
					<FeatureSection
						feature={feature}
						isExpanded={
							feature.status === "running" || feature.status === "pending"
						}
					/>
				))
			)}

			<script
				dangerouslySetInnerHTML={{
					__html: `
function toggleFeature(featureId) {
  var content = document.getElementById('content-' + featureId);
  var chevron = document.getElementById('chevron-' + featureId);
  if (content.style.maxHeight === '0px' || content.style.maxHeight === '') {
    content.style.maxHeight = content.scrollHeight + 'px';
    chevron.style.transform = 'rotate(90deg)';
  } else {
    content.style.maxHeight = '0px';
    chevron.style.transform = 'rotate(0deg)';
  }
}
`,
				}}
			/>
		</Layout>,
	);
});

export default pages;
