# Project State — mcpwall

**Current milestone:** v0.4.0 — Hardening & Quality
**Current phase:** 1 (Codebase Audit & Critical Fixes)
**Phase status:** complete

Last activity: 2026-02-27 - Completed quick task 1: audit and fix critical codebase issues

### Completed Quick Tasks

- **quick-1** (2026-02-27): Logger close() idempotency, streaming size enforcement, as-any removal with proper types, null-ID warning, config path normalization — 143 tests passing

### Decisions

- Kept post-read size check in check.ts as belt-and-suspenders for --input flag path
- substituteVariables normalizes absolute paths via resolve() to collapse ../ after env var expansion
- Used as Config cast at substituteInObject call sites — function processes unknown but preserves Config structure
- Pre-existing schema.ts type errors (Zod refine API) are out of scope — not introduced by this task

### Blockers/Concerns

None currently.
