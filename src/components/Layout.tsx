import type { FC, PropsWithChildren } from "hono/jsx";
import type { FlashMessage } from "../lib/flash.ts";

interface LayoutProps {
	title?: string;
	autoRefresh?: number;
	flash?: FlashMessage | null;
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
	children,
	title,
	autoRefresh,
	flash,
}) => {
	return (
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>
					{title ? `${title} | ClaudingCopilot` : "ClaudingCopilot"}
				</title>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossorigin=""
				/>
				<link rel="stylesheet" href="/styles/global.css" />
			</head>
			<body
				data-auto-refresh={autoRefresh || undefined}
				data-flash={flash ? JSON.stringify(flash) : undefined}
			>
				<div id="toast-container" class="toast-container"></div>

				<header class="header">
					<div class="header-container">
						<div class="header-brand">
							<div class="header-logo">
								<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</div>
							<a href="/" style="color: inherit; text-decoration: none;">
								<span class="header-title">ClaudingCopilot</span>
								<span class="header-version">v1.0.0</span>
							</a>
						</div>
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
				</header>

				<main class="main-container" id="main-content">
					{children}
				</main>

				{autoRefresh && (
					<div class="polling-indicator">
						<span class="polling-dot"></span>
						<span>Auto-refresh active</span>
					</div>
				)}

				<script src="/scripts/app.js"></script>
			</body>
		</html>
	);
};
