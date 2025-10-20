# GitHub Copilot Instructions for "Whispers and Flames"

This document provides guidance for GitHub Copilot when assisting with the "Whispers and Flames" project.

## Project Overview

**Whispers and Flames** is a Next.js 15 application that creates intimate conversation experiences through AI-guided questions. Users join private rooms, select categories and "spicy levels," and answer contextually generated questions.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: PostgreSQL (DigitalOcean Managed)
- **Backend**: In-memory storage (dev) / PostgreSQL (production)
- **AI**: Google's Gemini via Genkit
- **Deployment**: DigitalOcean App Platform

## When to Use GitHub Copilot Coding Agent

### ✅ **Use the Coding Agent For:**

1. **Multi-file feature implementations** that span 3+ files
2. **Complex UI flows** requiring coordination between components
3. **Database schema changes** and migration scripts
4. **Full feature additions** from the roadmap (see `docs/CODING_AGENT_PROMPT.md`)
5. **Architectural refactoring** that touches core systems
6. **Integration work** (new APIs, third-party services)
7. **When you need autonomous execution** of a detailed spec

### ❌ **Don't Use the Coding Agent For:**

1. **Simple bug fixes** (single line or function)
2. **Quick prototypes** or experiments
3. **Documentation updates** only
4. **Small UI tweaks** (color, spacing, single component)
5. **Debugging sessions** (use interactive Copilot Chat instead)
6. **Code explanations** (use inline chat)

### 📋 **How to Use the Coding Agent:**

**Step 1: Prepare a detailed prompt**

- Include specific file paths
- Define expected behavior clearly
- List acceptance criteria
- Reference existing patterns to follow

**Step 2: Mention the agent explicitly**

- Use `#github-pull-request_copilot-coding-agent` in your request
- The agent will create a new branch and open a PR

**Step 3: Review the PR**

- Check the session logs for decisions made
- Test the implementation locally
- Merge when satisfied

**Example Prompt:**

```
Implement Chaos Mode feature from docs/CODING_AGENT_PROMPT.md:
- Add toggle in spicy-step.tsx
- Create applyChaosMode() in game-utils.ts
- Show animated notification in game-step.tsx
- Update GameState type
#github-pull-request_copilot-coding-agent
```

## Why Use the Coding Agent?

### **Advantages:**

- Executes complex multi-step implementations autonomously
- Creates clean PRs with session logs showing reasoning
- Works in background while you focus on other tasks
- Follows architectural patterns consistently
- Reduces context-switching overhead

### **When Regular Copilot is Better:**

- You want to pair-program interactively
- You're exploring solutions and need back-and-forth
- The change is isolated to 1-2 files
- You need immediate feedback during typing

## Key Project Patterns

### File Structure

```
src/
├── app/game/[roomCode]/     # Game flow pages
│   └── steps/               # Step-by-step UI components
├── lib/                     # Utilities, types, storage
├── ai/flows/                # Genkit AI flows (DON'T MODIFY PROMPTS)
└── components/ui/           # shadcn/ui components
```

### Coding Standards

- Use TypeScript strict mode
- Prefer server components (`'use client'` only when needed)
- Use server actions for backend logic (`'use server'`)
- Follow existing shadcn/ui patterns
- Add proper error handling
- Include loading states

### Critical Rules

- ❌ **Never** modify existing AI flow prompts without approval
- ❌ **Never** add persistent user data (ephemeral only, 24hr TTL)
- ❌ **Never** break TypeScript strict mode
- ✅ **Always** use existing types from `game-types.ts`
- ✅ **Always** test the full game flow after changes

## Deployment

- App: `whispers-and-flames` on DigitalOcean
- Database: `whispers-flames-db` (PostgreSQL 17)
- Auto-deploys from `main` branch
- Environment variables managed in DO dashboard

---

**For detailed feature specs, see:** `docs/CODING_AGENT_PROMPT.md`
