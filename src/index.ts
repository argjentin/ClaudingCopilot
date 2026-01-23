import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { db, projects, tasks } from "./db/index.ts";
import { config } from "./lib/config.ts";
import api from "./routes/api.ts";
import pages from "./routes/pages.tsx";

const app = new Hono();

app.use("*", logger());

// Serve static files
app.use("/styles/*", serveStatic({ root: "./src" }));
app.use("/scripts/*", serveStatic({ root: "./src" }));
app.use("/fonts/*", serveStatic({ root: "./public" }));

// Mount API routes
app.route("/api", api);

// Mount page routes
app.route("/", pages);

app.get("/health", (c) => {
	const projectCount = db
		.select({ count: sql<number>`count(*)` })
		.from(projects)
		.get();
	const taskCount = db
		.select({ count: sql<number>`count(*)` })
		.from(tasks)
		.get();

	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		db: {
			projects: projectCount?.count ?? 0,
			tasks: taskCount?.count ?? 0,
		},
	});
});

export default {
	port: config.port,
	fetch: app.fetch,
};

console.log(`ClaudingCopilot running on http://localhost:${config.port}`);
