import type { FC } from "hono/jsx";
import type { Project, TaskCounts } from "../types/index.ts";

interface ProjectCardProps {
	project: Project;
	taskCounts: TaskCounts;
}

export const ProjectCard: FC<ProjectCardProps> = ({ project, taskCounts }) => {
	const statusBadgeClass = `badge badge-${project.status}`;
	const progress =
		taskCounts.total > 0
			? Math.round((taskCounts.done / taskCounts.total) * 100)
			: 0;

	return (
		<div class="glass-card" style="overflow: hidden;">
			<div style="padding: 1.25rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: flex-start; justify-content: space-between;">
				<div style="display: flex; flex-direction: column; gap: 0.25rem;">
					<div style="display: flex; align-items: center; gap: 0.5rem;">
						<a
							href={`/projects/${project.id}`}
							style="font-weight: 700; font-size: 1.125rem; color: var(--text-primary); text-decoration: none;"
						>
							{project.name}
						</a>
						<span class={statusBadgeClass}>{project.status}</span>
					</div>
					<div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-dimmed); font-size: 0.75rem;">
						<svg
							width="12"
							height="12"
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
						<span style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
							{project.path}
						</span>
					</div>
				</div>

				<button
					type="button"
					class="btn btn-icon btn-danger"
					title="Delete project"
					onclick={`if(confirm('Delete "${project.name}" and all its tasks?')) { apiAction('/api/projects/${project.id}', { method: 'DELETE', button: this, successMessage: 'Project deleted', refresh: true }); }`}
				>
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
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div style="padding: 1.25rem; background: var(--bg-surface);">
				<div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.75rem;">
					<div style="color: var(--text-muted); font-size: 0.75rem;">
						{taskCounts.features !== undefined && taskCounts.features > 0 && (
							<span style="color: var(--claude-copper-dark); font-weight: 700;">
								{taskCounts.features} features
							</span>
						)}
						{taskCounts.features !== undefined &&
							taskCounts.features > 0 &&
							" · "}
						<span style="color: var(--text-primary); font-weight: 700;">
							{taskCounts.done}
						</span>{" "}
						/ {taskCounts.total} tasks
					</div>
					<div style="color: var(--text-dimmed); font-size: 0.75rem;">
						{progress}%
					</div>
				</div>

				<div class="progress-bar">
					<div class="progress-fill" style={`width: ${progress}%;`}></div>
				</div>

				<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-top: 1rem;">
					<div style="background: var(--bg-primary); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
						<div style="font-size: 0.5625rem; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 0.25rem;">
							Total
						</div>
						<div style="font-size: 0.875rem; font-weight: 700;">
							{taskCounts.total}
						</div>
					</div>
					<div style="background: var(--bg-primary); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
						<div style="font-size: 0.5625rem; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 0.25rem;">
							Done
						</div>
						<div style="font-size: 0.875rem; font-weight: 700; color: var(--success-glow);">
							{taskCounts.done}
						</div>
					</div>
					<div style="background: var(--bg-primary); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
						<div style="font-size: 0.5625rem; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 0.25rem;">
							Running
						</div>
						<div style="font-size: 0.875rem; font-weight: 700; color: var(--running-amber);">
							{taskCounts.running}
						</div>
					</div>
					<div style="background: var(--bg-primary); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-subtle);">
						<div style="font-size: 0.5625rem; color: var(--text-dimmed); text-transform: uppercase; margin-bottom: 0.25rem;">
							Pending
						</div>
						<div style="font-size: 0.875rem; font-weight: 700; color: var(--text-muted);">
							{taskCounts.pending}
						</div>
					</div>
				</div>
			</div>

			<div style="padding: 1rem 1.25rem; background: var(--bg-surface); display: flex; align-items: center; justify-content: flex-end;">
				<a
					href={`/projects/${project.id}`}
					class="btn btn-secondary"
					style="font-size: 0.75rem; padding: 0.5rem 1rem;"
				>
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
							d="M9 5l7 7-7 7"
						/>
					</svg>
					View Details
				</a>
			</div>
		</div>
	);
};
