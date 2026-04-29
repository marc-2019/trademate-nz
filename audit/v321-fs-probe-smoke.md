# v3.2.1 fs-write probe smoke test

Timestamp: 2026-04-29 evening NZ.
Purpose: exercise the new universal post-flight fs-write probe (Patch U)
on a managed project task with task_type=audit (a C1 bypass class —
not in CODE_EDIT_TASK_TYPES). Existing is_managed_edit block at
L2154 will NOT run; the new probe at L2150 must catch this.

Expected outcome: probe detects head_moved on trademate-nz, runs
pre_push_audit (Patch I) on the new commit, outcome=pass written
to cf_guard_decisions.

File target: audit/v321-fs-probe-smoke.md
Project: trademate-nz
Task type: audit (C1)

Success criterion: this exact file exists at the path above with the
content above, and a cf_guard_decisions row appears with
guard_name=fs_write_cascade_audit and outcome=pass.