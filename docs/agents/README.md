# OnQuest agents

How work moves from an idea to production, which agent does each step, and where it runs. Agents never approve their own work; every highlighted gate is a person.

| Stage (Build Tracker) | Who | Runs in | Instructions |
|---|---|---|---|
| 1–2. Discussing, PRD drafting | Product agent + founder | claude.ai (skill `onquest-product`) | [`onquest-product.md`](onquest-product.md) (copy of the skill) |
| **3. PRD approval** | **Founder** | | |
| 4. Tech spec | Tech Lead agent | Claude Code | [`.claude/agents/tech-lead.md`](../../.claude/agents/tech-lead.md) |
| 5. Plan review | Reviewer agent | Claude Code | [`.claude/agents/reviewer.md`](../../.claude/agents/reviewer.md) |
| **6. Spec approval** | **CTO** | | |
| 7–8. Ready to build, Building | Backend / Frontend agents | Claude Code | Not written yet |
| 9. Agent review (QA, security, compatibility) | Reviewer agent + CI | Claude Code, GitHub Actions | `reviewer.md`, [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) |
| **10. UX testing** | **A person**, on the Vercel preview | | |
| **11. Code review** | **A different person** | | |
| 12. Staging | Ops agent + CI | | Not written yet |
| **13. Prod approval** | **Founder or CTO** | | |
| 14. Live | | | |

## Where things are

- **Build Tracker** (every feature and task, by stage): Google Sheet "OnQuest Build Tracker", https://docs.google.com/spreadsheets/d/1kEDIs6Lb9bzmNaztkfJn5TkejdFtUhn2kwuqpFV_p08/edit
- **Rules every agent follows:** `CLAUDE.md` (also `AGENTS.md`), and the decisions in `docs/decisions/`
- **PRDs:** `docs/prds/` · **Specs:** `docs/specs/` (from `TEMPLATE.md`) · **Review reports:** `docs/reviews/`

## Keeping the Product agent in sync

The Product agent runs in claude.ai, so the copy here is for reference and review. When its instructions change, update the skill in claude.ai (Settings → Capabilities → Skills) and this file together.
