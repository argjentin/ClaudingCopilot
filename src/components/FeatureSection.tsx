import type { FC } from "hono/jsx";
import { formatDuration } from "../lib/utils.ts";
import type { FeatureWithTasks } from "../types/index.ts";
import { TaskRow } from "./TaskRow.tsx";

interface FeatureSectionProps {
	feature: FeatureWithTasks;
	isExpanded?: boolean;
}

export const FeatureSection: FC<FeatureSectionProps> = ({
	feature,
	isExpanded = true,
}) => {
	const statusBadgeClass = `badge badge-${feature.status}`;
	const doneTasks = feature.tasks.filter((t) => t.status === "done").length;
	const totalTasks = feature.tasks.length;
	const progress =
		totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

	const featureId = `feature-${feature.id}`;

	return (
		<div
			class="feature-section glass-card-static"
			style="margin-bottom: 1rem; overflow: hidden;"
		>
			<div
				class="feature-header"
				style="padding: 1rem 1.25rem; background: var(--bg-surface); border-bottom: 1px solid var(--border-subtle); cursor: pointer; display: flex; align-items: center; justify-content: space-between;"
				onclick={`toggleFeature('${featureId}')`}
			>
				<div style="display: flex; align-items: center; gap: 1rem; min-width: 0; flex: 1;">
					<span
						class="feature-chevron"
						id={`chevron-${featureId}`}
						style={`transition: transform 0.2s ease; display: inline-flex; color: var(--text-dimmed); flex-shrink: 0; transform: ${isExpanded ? "rotate(90deg)" : "rotate(0deg)"};`}
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
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</span>

					<span style="width: 36px; min-width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border-subtle); background: rgba(196, 167, 125, 0.15); display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 700; color: var(--claude-copper-dark); flex-shrink: 0;">
						{String(feature.number).padStart(2, "0")}
					</span>

					<div style="display: flex; flex-direction: column; min-width: 0; overflow: hidden;">
						<span style="font-size: 1rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
							{feature.name}
						</span>
						<span style="font-size: 0.625rem; color: var(--text-dimmed); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
							{feature.folderName}
						</span>
					</div>
				</div>

				<div style="display: flex; align-items: center; gap: 1rem; flex-shrink: 0;">
					{feature.branchName && (
						<div
							style="display: flex; align-items: center; gap: 0.5rem; max-width: 150px;"
							class="branch-info"
						>
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
								{feature.branchName}
							</span>
						</div>
					)}

					<div style="display: flex; align-items: center; gap: 0.5rem; min-width: 80px;">
						<div style="flex: 1; height: 4px; background: var(--border-subtle); border-radius: 2px; overflow: hidden;">
							<div
								style={`height: 100%; background: var(--success-glow); width: ${progress}%; transition: width 0.3s ease;`}
							></div>
						</div>
						<span style="font-size: 0.625rem; color: var(--text-dimmed); min-width: 40px; text-align: right;">
							{doneTasks}/{totalTasks}
						</span>
					</div>

					<span class={statusBadgeClass} style="flex-shrink: 0;">
						{feature.status}
					</span>

					{feature.durationMs && (
						<span style="font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0;">
							{formatDuration(feature.durationMs)}
						</span>
					)}
				</div>
			</div>

			<div
				class="feature-content"
				id={`content-${featureId}`}
				style={`overflow: hidden; transition: max-height 0.3s ease; ${isExpanded ? "" : "max-height: 0;"}`}
			>
				{feature.context && (
					<div style="padding: 0.75rem 1.25rem; background: rgba(196, 167, 125, 0.08); border-bottom: 1px solid var(--border-subtle);">
						<div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
							<svg
								width="12"
								height="12"
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
								Feature Context
							</span>
						</div>
						<p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; margin: 0; white-space: pre-wrap; max-height: 100px; overflow-y: auto;">
							{feature.context.slice(0, 500)}
							{feature.context.length > 500 ? "..." : ""}
						</p>
					</div>
				)}

				<div style="overflow-x: auto;">
					<table class="data-table">
						<thead>
							<tr>
								<th style="width: 70px;">Seq</th>
								<th style="width: 40%;">Task</th>
								<th style="width: 25%;">Branch</th>
								<th style="width: 90px;">Status</th>
								<th style="width: 90px;">Time</th>
							</tr>
						</thead>
						<tbody>
							{feature.tasks.length === 0 ? (
								<tr>
									<td
										colspan={5}
										style="text-align: center; padding: 1.5rem; color: var(--text-dimmed);"
									>
										No tasks in this feature
									</td>
								</tr>
							) : (
								feature.tasks.map((task) => <TaskRow task={task} />)
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
