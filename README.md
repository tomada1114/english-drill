# English Drill

A keyboard-friendly, mobile-friendly English quiz. One question at a time,
immediate explanations, and a copyable result for your learning journal.

No account, database, analytics or LLM request. The public website runs entirely
in your browser. In-progress answers stay in that browser's local storage and do
not sync across devices. Finish a drill, copy its result, then ask your agent to
import it into the private learning journal.

## Use

- **H / J / K / L**: answer with option 1 / 2 / 3 / 4 at once and show the result and explanation. They work in Japanese input mode too.
- **Enter**: move to the next question (or check an option selected by touch or Tab). No click is needed between questions.
- Touch or click an option, then check it with the answer button.
- Read the explanation before moving on. First answers cannot be changed.
- Copy completed results, or use the text fallback when clipboard access fails.

## Develop and deploy

Node.js 22+ is sufficient; no package installation is required.

```sh
node --test
npm run dev
```

Open `http://localhost:4317`. In Vercel, import this Git repository; the checked-in
configuration runs the tests and serves `public/`. PRs are reviewed before merging.

The private iobsidian vault generates and validates source sets. Its
`make drill-build` exports sanitized immutable snapshots into `public/data/`.
Do not put transcripts, personal speech source records, private filesystem paths
or answer logs in this repository. The public set hash ties copied results to the
private source set. Changes to an existing source set must not silently overwrite
published data.

## Design

The existing drill sheet supplies the neutral typography, blue action color and
immediate answer feedback. Refero's typography and accessibility craft guides
inform visible keyboard focus, native buttons, readable type and touch targets.
The new interaction is a single question with a visible selected option, a separate
answer action and explicit next action. Light and dark modes follow the system.
Keyboard-friendly English drills with copyable results.
