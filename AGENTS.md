# English Drill

A dependency-free static English quiz. The private iobsidian vault owns question
generation and the append-only answer ledger. This repository owns the public UI
and sanitized question snapshots. Do not add a database, login, LLM call or Notion
integration. Results leave the browser only when the learner copies them.

- Run `node --test` before committing. Vercel runs the same check and serves `public/`.
- Run `npm run dev` for a local preview on port 4317.
- Keep keyboard (HJKL, arrows, Enter, 1–4), touch and native Tab navigation usable.
- Never revise an existing `public/data/<id>.json`; the private importer verifies its hash.
- Add or update the catalog with the vault's `make drill-build`; never copy transcripts,
  review files, answer logs, local paths or credentials into this repository.
- Verify desktop and phone layouts and the exported JSON before opening a PR.
- PR creation does not authorize merging or a production release.
