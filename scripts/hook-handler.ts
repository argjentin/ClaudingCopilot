#!/usr/bin/env bun

interface HookData {
	transcript_path?: string;
	[key: string]: unknown;
}

const RATE_LIMIT_PATTERNS = [
	"usage limit reached",
	"rate_limit_error",
	"rate limit exceeded",
	"too many requests",
];

async function main(): Promise<void> {
	const [taskId, apiBaseUrl] = Bun.argv.slice(2);

	if (!taskId || !apiBaseUrl) {
		console.error("Usage: bun run hook-handler.ts <taskId> <apiBaseUrl>");
		process.exit(1);
	}

	try {
		// Read stdin with timeout to avoid blocking forever
		const stdinPromise = Bun.stdin.text();
		const timeoutPromise = new Promise<string>((_, reject) =>
			setTimeout(() => reject(new Error("stdin timeout")), 5000)
		);

		let stdinText = "";
		try {
			stdinText = await Promise.race([stdinPromise, timeoutPromise]);
		} catch {
			stdinText = "{}";
		}
		const hookData: HookData = stdinText ? JSON.parse(stdinText) : {};

		let rateLimited = false;

		if (hookData.transcript_path) {
			try {
				const transcriptFile = Bun.file(hookData.transcript_path);
				if (await transcriptFile.exists()) {
					const content = await transcriptFile.text();
					const contentLower = content.toLowerCase();
					rateLimited = RATE_LIMIT_PATTERNS.some((pattern) =>
						contentLower.includes(pattern.toLowerCase()),
					);
				}
			} catch {}
		}

		const response = await fetch(`${apiBaseUrl}/api/tasks/${taskId}/complete`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rate_limited: rateLimited }),
		});

		if (!response.ok) {
			console.error(`API responded with status ${response.status}`);
			process.exit(1);
		}
	} catch (error) {
		console.error("Hook handler error:", error);
	}
}

main();
