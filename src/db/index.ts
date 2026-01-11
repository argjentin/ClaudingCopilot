import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema.ts";

const DB_PATH = "./data/claudingcopilot.db";

if (!existsSync("./data")) {
	mkdirSync("./data", { recursive: true });
}

const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });

export * from "./schema.ts";
