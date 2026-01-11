import type { FC } from "hono/jsx";
import { formatDuration } from "../lib/utils.ts";
import type { Task } from "../types/index.ts";

interface ProjectStatsProps {
	tasks: Task[];
}

export const ProjectStats: FC<ProjectStatsProps> = ({ tasks }) => {
	const total = tasks.length;
	const done = tasks.filter((t) => t.status === "done").length;
	const _pending = tasks.filter((t) => t.status === "pending").length;
	const running = tasks.filter((t) => t.status === "running").length;
	const _failed = tasks.filter((t) => t.status === "failed").length;

	const totalDuration = tasks.reduce((sum, t) => sum + (t.durationMs || 0), 0);

	const completedTasks = tasks.filter((t) => t.durationMs);
	const _avgDuration =
		completedTasks.length > 0 ? totalDuration / completedTasks.length : 0;

	return (
		<div class="stats-strip">
			<div class="stat-card">
				<div>
					<div class="text-label" style="margin-bottom: 0.25rem;">
						Total Tasks
					</div>
					<div class="stat-value">{total}</div>
				</div>
				<div
					class="stat-icon"
					style="background: rgba(139, 92, 246, 0.1); color: var(--claude-purple);"
				>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
				</div>
			</div>

			<div class="stat-card">
				<div>
					<div class="text-label" style="margin-bottom: 0.25rem;">
						Completed
					</div>
					<div class="stat-value" style="color: var(--success-glow);">
						{done}
					</div>
				</div>
				<div
					class="stat-icon"
					style="background: rgba(16, 185, 129, 0.1); color: var(--success-glow);"
				>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
			</div>

			<div class="stat-card">
				<div>
					<div class="text-label" style="margin-bottom: 0.25rem;">
						Running
					</div>
					<div class="stat-value" style="color: var(--running-amber);">
						{running}
					</div>
				</div>
				<div
					class="stat-icon"
					style="background: rgba(245, 158, 11, 0.1); color: var(--running-amber);"
				>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 10V3L4 14h7v7l9-11h-7z"
						/>
					</svg>
				</div>
			</div>

			<div class="stat-card">
				<div>
					<div class="text-label" style="margin-bottom: 0.25rem;">
						Total Time
					</div>
					<div class="stat-value" style="font-size: 1.25rem;">
						{totalDuration > 0 ? formatDuration(totalDuration) : "-"}
					</div>
				</div>
				<div
					class="stat-icon"
					style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;"
				>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
};
