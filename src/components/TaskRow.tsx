import type { FC } from "hono/jsx";
import { formatDuration } from "../lib/utils.ts";
import type { Task } from "../types/index.ts";

interface TaskRowProps {
	task: Task;
}

export const TaskRow: FC<TaskRowProps> = ({ task }) => {
	const statusBadgeClass = `badge badge-${task.status}`;

	return (
		<tr>
			<td>
				<div style="display: flex; align-items: center; gap: 0.75rem;">
					<span style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--text-muted);">
						{String(task.number).padStart(2, "0")}
					</span>
				</div>
			</td>
			<td>
				<div style="display: flex; flex-direction: column; min-width: 0; overflow: hidden;">
					<span style="font-size: 0.875rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
						{task.title}
					</span>
					<span style="font-size: 0.625rem; color: var(--text-dimmed); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
						{task.filename}
					</span>
				</div>
			</td>
			<td class="branch-cell">
				{task.branchName ? (
					<div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0; overflow: hidden;">
						<svg
							width="12"
							height="12"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							style="color: var(--text-dimmed); flex-shrink: 0;"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
							/>
						</svg>
						<span style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
							{task.branchName}
						</span>
					</div>
				) : (
					<span style="color: var(--text-dimmed); font-size: 0.75rem;">-</span>
				)}
			</td>
			<td>
				<span class={statusBadgeClass}>{task.status}</span>
			</td>
			<td>
				{task.status !== "pending" ? (
					<div style="display: flex; gap: 1rem;">
						<div style="display: flex; flex-direction: column;">
							<span style="font-size: 0.5rem; color: var(--text-dimmed); text-transform: uppercase; font-weight: 700;">
								Time
							</span>
							<span style="font-size: 0.6875rem; font-weight: 700;">
								{formatDuration(task.durationMs)}
							</span>
						</div>
					</div>
				) : (
					<span style="font-size: 0.75rem; color: var(--text-dimmed); font-style: italic;">
						No data yet
					</span>
				)}
			</td>
		</tr>
	);
};
