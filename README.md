# ClaudingCopilot

**Automated task orchestrator for Claude Code CLI** - Execute multiple AI coding tasks sequentially with automatic git management, branch strategies, and progress tracking.

> Transform your development workflow: define tasks in markdown, let Claude Code execute them one by one, and get automatic commits, merges, and metrics.

## Why ClaudingCopilot?

When working with Claude Code on complex projects, you often need to:
- Break down features into multiple tasks
- Ensure each task runs with fresh context (no token overflow)
- Track what was done, how long it took
- Manage git branches properly

**ClaudingCopilot automates all of this.**

## Features

- **Sequential task execution** - Tasks run one after another, each in a fresh terminal
- **Feature-based organization** - Group tasks by feature with shared context
- **3 Git modes** - Full branching, single-branch, or disabled
- **Automatic git operations** - Branch creation, commits, merges, pushes
- **Web dashboard** - Monitor progress, view metrics, manage projects
- **Metrics tracking** - Duration per task and feature
- **Rate limit detection** - Pauses automatically when rate limited

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Claude Code CLI](https://docs.anthropic.com/claude-code) installed (`claude` command)
- Git installed

### Installation

```bash
git clone https://github.com/argjentin/ClaudingCopilot.git
cd ClaudingCopilot
bun install
bun run db:migrate
bun run dev
```

Open **http://localhost:3000**

## Usage

### 1. Prepare your project structure

Create a `tasks/` folder in your project with feature subfolders:

```
my-project/
├── CLAUDE.md              # Project instructions for Claude
└── tasks/
    ├── 01_tasks_auth/
    │   ├── README.md      # Feature context (read before each task)
    │   ├── 01-setup-auth.md
    │   ├── 02-login-page.md
    │   └── 03-register.md
    ├── 02_tasks_payment/
    │   ├── README.md
    │   ├── 01-stripe-setup.md
    │   └── 02-checkout.md
    └── 03_tasks_dashboard/
        └── 01-analytics.md
```

**Naming conventions:**
- Feature folders: `XX_tasks_name` (e.g., `01_tasks_auth`)
- Task files: `XX-task-name.md` (e.g., `01-setup-auth.md`)
- `README.md` in each feature folder provides context to Claude

### 2. Create a project in the dashboard

1. Click **"+ New Project"**
2. Enter project name and absolute path
3. Choose your **Git mode** (see below)
4. Click **"Scan Features"** to import tasks
5. Click **"Start"** to begin execution

### 3. Watch it work

ClaudingCopilot will:
1. Create the appropriate git branches
2. Open a terminal with Claude Code
3. Execute each task with proper context
4. Commit and merge when done
5. Move to the next task automatically

## Git Modes

### Mode: `branching` (default)

Full git workflow with feature and task branches:

```
main
├── feature/auth
│   ├── task-01-01-setup-auth      → merged to feature/auth
│   ├── task-01-02-login-page      → merged to feature/auth
│   └── task-01-03-register        → merged to feature/auth
│   └── feature/auth merged to main, then deleted
├── feature/payment
│   └── ...
```

**Behavior:**
- Creates `feature/xxx` branch from main
- Creates `task-XX-XX-xxx` branch for each task
- Merges task → feature → main with explicit messages
- Deletes branches after merge
- Full traceability on GitHub

### Mode: `single-branch`

All work on a dedicated branch, merged at the end:

```
main
└── your-work-branch
    ├── commit: "feat: complete setup auth"
    ├── commit: "feat: complete login page"
    └── ... all tasks ...
    └── merged to main when ALL tasks done, then deleted
```

**Behavior:**
- Creates work branch from main (or uses existing)
- Commits directly to work branch after each task
- Merges to main only when project is complete
- Requires `workBranch` name

### Mode: `disabled`

No git operations at all:

- Works on current branch
- No commits, no pushes, no merges
- You manage git yourself

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Server port
PORT=3000

# Git main branch name
GIT_MAIN_BRANCH=main

# API base URL (optional - only if different host needed)
# API_BASE_URL=https://your-server.com
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `GIT_MAIN_BRANCH` | Main branch name for git operations | `main` |
| `API_BASE_URL` | Override callback URL (for Docker/production) | `http://localhost:${PORT}` |

### Project Options

| Option | Description | Default |
|--------|-------------|---------|
| `branchingMode` | `branching`, `single-branch`, or `disabled` | `branching` |
| `workBranch` | Branch name for single-branch mode | Required if single-branch |
| `autoPush` | Push to remote after operations | `true` |

## Task File Example

```markdown
# Setup Authentication

## Objective
Configure authentication with Better Auth library.

## Context
- We're using Next.js 16
- Database is PostgreSQL with Prisma
- See existing auth patterns in src/lib/

## Steps
1. Install better-auth: `bun add better-auth`
2. Create auth configuration in src/lib/auth.ts
3. Add auth API routes
4. Create login/register pages

## Acceptance Criteria
- [ ] Users can register with email
- [ ] Users can login/logout
- [ ] Session persists across page refreshes
```

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                     ClaudingCopilot                          │
│                   http://localhost:3000                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User clicks "Start"                                      │
│  2. Creates git branch (based on mode)                       │
│  3. Writes completion hook to .claude/settings.json          │
│  4. Opens terminal: claude "Execute task..."                 │
│  5. Claude Code works on the task                            │
│  6. Claude finishes → Hook calls /api/tasks/:id/complete     │
│  7. Commits, merges, pushes (based on mode)                  │
│  8. Records metrics (duration)                               │
│  9. Launches next task → Repeat                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/) (API + JSX SSR)
- **Database**: SQLite + [Drizzle ORM](https://orm.drizzle.team/)
- **UI**: Server-rendered JSX (no client-side framework)

## Commands

```bash
bun run dev          # Start development server
bun run start        # Start production server
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | Dashboard home |
| `GET` | `/projects/:id` | Project detail page |
| `POST` | `/api/projects/:id/scan` | Scan features from /tasks/ |
| `POST` | `/api/projects/:id/start` | Start execution |
| `POST` | `/api/projects/:id/stop` | Stop execution |
| `POST` | `/api/tasks/:id/complete` | Task completion callback |

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT
