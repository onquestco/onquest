# OnQuest agents

How work moves from an idea to production, which agent does each step, and where it runs. Agents never approve their own work; every highlighted gate is a person.

| Stage (Build Tracker) | Who | Runs in | Instructions |
|---|---|---|---|
| 1–2. Discussing, PRD drafting | Product agent + founder | claude.ai (skill `onquest-product`) | [`onquest-product.md`](onquest-product.md) (copy of the skill) |
| **3. PRD approval** | **Founder** | | |
| 4. Tech spec | Tech Lead agent | Claude Code | [`.claude/agents/tech-lead.md`](../../.claude/agents/tech-lead.md) |
| 5. Plan review | Reviewer agent | Claude Code | [`.claude/agents/reviewer.md`](../../.claude/agents/reviewer.md) |
| **6. Spec approval** | **CTO** | | |
| 7–8. Ready to build, Building | Backend agent / Frontend agent | Claude Code | [`.claude/agents/backend.md`](../../.claude/agents/backend.md), [`.claude/agents/frontend.md`](../../.claude/agents/frontend.md) |
| 9. Agent review (QA, security, compatibility) | Reviewer agent + CI | Claude Code, GitHub Actions | `reviewer.md`, [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| **10. UX testing** | **A person**, on the Vercel preview | | |
| **11. Code review** | **A different person** | | |
| 12. Staging | CI + Vercel (no Ops agent yet; see below) | | |
| **13. Prod approval** | **Founder or CTO** | | |
| 14. Live | | | |

## Where things are

- **Build Tracker** (every feature and task, by stage): Google Sheet "OnQuest Build Tracker", https://docs.google.com/spreadsheets/d/1kEDIs6Lb9bzmNaztkfJn5TkejdFtUhn2kwuqpFV_p08/edit
- **Rules every agent follows:** `CLAUDE.md` (also `AGENTS.md`), and the decisions in `docs/decisions/`
- **PRDs:** `docs/prds/` · **Specs:** `docs/specs/` (from `TEMPLATE.md`) · **Review reports:** `docs/reviews/`

## Running the agents in Claude Code

Ask in plain words, naming the agent and the work:

- "Use the tech-lead agent to write the spec for `docs/prds/<file>.md`."
- "Use the reviewer agent to do a plan review of PR #12." / "…a PR review of #15." / "…a setup audit."
- "Use the backend agent to build issue #21." / "Use the frontend agent to build issue #22."

Independent tasks can run side by side in separate git worktrees. A builder never reviews its own PR: the reviewer agent and two different people do.

## Not built yet

- **Ops agent.** Vercel deploys previews and production from GitHub, and CI checks every PR, so there is nothing for it to do until production migrations and releases are automated. Add it then.

## Keeping the Product agent in sync

The Product agent runs in claude.ai, so the copy here is for reference and review. When its instructions change, update the skill in claude.ai (Settings → Capabilities → Skills) and this file together.
