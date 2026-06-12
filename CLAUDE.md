## Workflow Rules
- **Task Execution:** When taking a task from the TODO file, ALWAYS verify the exact file paths using `ls` or `grep` first. 
- **No Guessing:** Do not create new files or edit existing ones unless you are 100% certain of the architecture. If multiple files share similar names, ask for clarification before proceeding.

## Testing & Output Rules (CRITICAL)
- **Zero-Bloat Testing:** NEVER output passing test results to the terminal. I strictly only want to see failures.
- **Enforce Quiet Flags:** When running tests, you MUST use the runner's built-in flags to suppress successful tests and standard output (e.g., `--quiet`, `--silent`, `-q`, `--fail-fast`, or `--reporter=dot`).
- **Use Grep if Necessary:** If the test runner cannot be silenced natively, you MUST pipe the command to filter out passing lines (e.g., `| grep -iE "fail|error|exception"`).
- **Targeted Testing Only:** Do not run the global test suite unless explicitly asked. Only run the specific test file associated with your current TODO task.

## Version Management (CRITICAL)
- **Bump on every functional change:** Any change to files under `extension/` that affects the built artifact MUST bump the version in BOTH places at once, before considering the change done:
  - `extension/manifest.json` → `"version": "X.Y.Z"`
  - `extension/popup.html` → `<span class="version">vX.Y.Z</span>`
  Both must always match. If they drift, the popup will misreport while Chrome reads the manifest.
- **Semantic versioning:**
  - **PATCH** (`1.0.x`) — bug fixes, copy/wording tweaks, refactors, selector updates, anything with no new user-visible feature.
  - **MINOR** (`1.x.0`) — new user-visible feature, new target, new permission, new settings field, new locale.
  - **MAJOR** (`x.0.0`) — breaking change (forces re-export, drops a target, requires user to re-OAuth, changes IndexedDB schema in a non-additive way).
- **Doc/config-only changes don't bump:** Updates limited to `CLAUDE.md`, `TODO.md`, `README.md`, `WEB_STORE_LISTING.md`, or other Markdown outside `extension/` don't need a version bump on their own. If the same commit also touches code under `extension/`, bump per the rule above.
- **Append the changelog line:** After bumping, add a one-line entry to `CHANGELOG.md` (create it if missing) under a new `## vX.Y.Z — YYYY-MM-DD` header summarizing what changed in plain language. The popup version label is the only place a user sees the number, so the changelog is the answer to "what did this update do?"