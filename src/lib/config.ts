const PORT = parseInt(process.env.PORT || "3000", 10);
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;
const GIT_MAIN_BRANCH = process.env.GIT_MAIN_BRANCH || "main";

export const config = {
	port: PORT,
	apiBaseUrl: API_BASE_URL,
	gitMainBranch: GIT_MAIN_BRANCH,
} as const;
