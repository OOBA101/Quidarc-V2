# Contributing to Quidarc

We have ~2.5 weeks and 3 people. This process is deliberately light — the goal is avoiding painful merge conflicts near the deadline, not process for its own sake.

## Branch Strategy: Trunk-Based

- `main` is always deployable. Don't let it sit broken.
- Branch directly off `main` for whatever you're working on: `git checkout -b your-name/short-description`.
- **Merge often — at least once a day if you can.** Small, frequent merges beat one giant PR at the end of a sprint. The longer a branch lives, the worse the eventual merge.
- Open a PR, get a quick look from one other person (doesn't need to be exhaustive — this is about catching obvious issues, not a formal review process), merge.
- No long-lived feature branches. If something's going to take more than 2-3 days, break it into smaller mergeable pieces.

## The Three Tracks

See `docs/quidarc-build-plan.md` for the current sprint-by-sprint breakdown. Quick reference:

- **Track A — Wallet & Chain Integration:** wallet create/import, Execution Engine (Circle App Kit), Agent Wallet Module (Circle Developer-Controlled Wallets)
- **Track B — Backend & Agent Orchestration:** backend scaffold, LLM/tool-calling, Permission Module
- **Track C — Frontend & Content:** web app shell, chat UI, Permission Card panel, news/dApp content

These are a starting default based on module boundaries, not a fixed assignment — rebalance based on who's strongest where.

## Before You Touch Permission Logic or the Agent Wallet

Read `docs/quidarc-agent-governance.md` first. The custody model, the Permission Card schema, and the fail-closed enforcement rule are all specified there — don't improvise a different pattern for convenience. This is the one part of the product where a shortcut under deadline pressure creates real risk, not just tech debt.

## Commits

Clear, specific messages. No strict format required, but "fix stuff" doesn't tell anyone anything three days from now when we're debugging under pressure. Reference which track/module a commit touches when it's not obvious from the diff.

## Environment Variables & Secrets

Never commit `.env` files, API keys, or Circle/Anthropic credentials — `.gitignore` already excludes `.env*`. Secrets live in the hosting platform's environment store. If you're not sure where a credential goes, ask before pasting it anywhere, including into chat with an AI assistant.

## Daily Sync

Once Sprint 2 starts, the three tracks converge (chat flow needs Track A's execution tools + Track B's orchestration + Track C's UI all wired together). Worth a quick daily check-in from that point on — async is fine, doesn't need to be a call.
