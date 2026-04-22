---
name: git-workflow
description: Use when a task involves git status inspection, branch management, staging, commits, diffs, history review, conflict-aware change handling, or preparing changes for push and pull request workflows.
---

# Git Workflow

Use this skill when the task needs disciplined git handling rather than ad hoc commands.

## Goals

- Understand repository state before acting.
- Preserve user changes and avoid destructive history edits.
- Keep branch, staging, commit, and review steps explicit.
- Prefer non-interactive commands and summarize the meaningful results.

## Required workflow

1. Inspect state first.
   - Check branch, worktree status, and relevant diffs before any git write action.
   - Distinguish user changes from task-local changes.

2. Choose the smallest safe git action.
   - For review: inspect `status`, `diff`, `log`, `show`, or targeted file history.
   - For branch work: create or switch branches explicitly and keep the scope narrow.
   - For staging and commit: stage only the intended files and verify the staged diff before committing.

3. Protect existing work.
   - Never revert unrelated changes.
   - Never use destructive commands such as hard reset, checkout-overwrite, force push, or history rewrite unless explicitly requested.
   - Avoid interactive git flows when a non-interactive command exists.

4. Validate before concluding.
   - Confirm the final worktree state.
   - If committing, verify the staged content and resulting commit.
   - If pushing or preparing a PR, verify the branch and resulting diff scope.

## Safety rules

- Assume the worktree may already be dirty.
- Treat reset, rebase, amend, checkout-overwrite, and force push as high-risk operations.
- Prefer targeted commands over broad repo-wide actions.
- Report when git state prevents a safe automatic action.

## Useful checks

- current branch and divergence
- staged versus unstaged diff
- file-specific history
- whether edits overlap with unrelated local changes
- whether the repo has hooks or CI expectations that affect commit readiness

## Output expectations

Before a git write action, produce a short internal checklist containing:

- current branch and worktree state
- files intended for the action
- whether unrelated local changes exist
- exact command sequence needed
