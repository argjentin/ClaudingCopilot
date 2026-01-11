import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	path: text("path").notNull(),
	status: text("status", {
		enum: ["idle", "running", "done", "rate_limited"],
	})
		.default("idle")
		.notNull(),
	branchingMode: text("branching_mode", {
		enum: ["branching", "single-branch", "disabled"],
	})
		.default("branching")
		.notNull(),
	workBranch: text("work_branch"),
	autoCommit: integer("auto_commit", { mode: "boolean" })
		.default(true)
		.notNull(),
	autoPush: integer("auto_push", { mode: "boolean" }).default(true).notNull(),
	currentFeatureId: text("current_feature_id"),
	currentTaskId: text("current_task_id"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});

export const features = sqliteTable(
	"features",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.references(() => projects.id, { onDelete: "cascade" })
			.notNull(),
		number: integer("number").notNull(),
		name: text("name").notNull(),
		folderName: text("folder_name").notNull(),
		context: text("context"),
		status: text("status", {
			enum: ["pending", "running", "done", "failed"],
		})
			.default("pending")
			.notNull(),
		branchName: text("branch_name"),
		startedAt: integer("started_at", { mode: "timestamp" }),
		completedAt: integer("completed_at", { mode: "timestamp" }),
		durationMs: integer("duration_ms"),
	},
	(table) => [index("features_project_id_idx").on(table.projectId)],
);

export const tasks = sqliteTable(
	"tasks",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.references(() => projects.id, { onDelete: "cascade" })
			.notNull(),
		featureId: text("feature_id")
			.references(() => features.id, { onDelete: "cascade" })
			.notNull(),
		number: integer("number").notNull(),
		title: text("title").notNull(),
		filename: text("filename").notNull(),
		status: text("status", {
			enum: ["pending", "running", "done", "failed"],
		})
			.default("pending")
			.notNull(),
		branchName: text("branch_name"),
		startedAt: integer("started_at", { mode: "timestamp" }),
		completedAt: integer("completed_at", { mode: "timestamp" }),
		durationMs: integer("duration_ms"),
	},
	(table) => [
		index("tasks_project_id_idx").on(table.projectId),
		index("tasks_feature_id_idx").on(table.featureId),
	],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Feature = typeof features.$inferSelect;
export type NewFeature = typeof features.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
