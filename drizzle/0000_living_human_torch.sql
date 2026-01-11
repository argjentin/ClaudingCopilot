CREATE TABLE `features` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	`folder_name` text NOT NULL,
	`context` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`branch_name` text,
	`started_at` integer,
	`completed_at` integer,
	`duration_ms` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `features_project_id_idx` ON `features` (`project_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`branching_mode` text DEFAULT 'branching' NOT NULL,
	`work_branch` text,
	`auto_commit` integer DEFAULT true NOT NULL,
	`auto_push` integer DEFAULT true NOT NULL,
	`current_feature_id` text,
	`current_task_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`feature_id` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`filename` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`branch_name` text,
	`started_at` integer,
	`completed_at` integer,
	`duration_ms` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tasks_project_id_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_feature_id_idx` ON `tasks` (`feature_id`);