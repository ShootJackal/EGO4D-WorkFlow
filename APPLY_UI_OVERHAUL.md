# Apply UI overhaul (testing branch) in another clone/agent

This folder has the **patch** of the UI overhaul so another agent or clone can get the same changes without pushing/pulling.

## Option 1: Apply the patch (same repo, other clone or agent)

From the repo root, with a clean working tree (or stash changes), run:

```bash
# Make sure you're on the branch you want to update (e.g. main or a feature branch)
git apply ui-overhaul-from-main.patch
```

If you get "already exists" or path errors, the other side may have different files; try:

```bash
git apply --3way ui-overhaul-from-main.patch
```

Then resolve any conflicts and commit.

## Option 2: Push the testing branch (this machine)

If you run from the machine that has the `testing` branch and is authenticated to GitHub:

```bash
git push -u origin testing
```

Then the other agent can run:

```bash
git fetch origin testing
git checkout testing
# or merge into their branch: git merge origin/testing
```

## What the patch contains

- Tab order: Live first (home)
- Theme: `headerBg`, `headerBorder`, `shadowSoft` in colors
- Theme cycle on Live: Light / Dark / System
- Boot screen: more messages, soft depth, `colors.bg` transition
- Bottom island: `expo-linear-gradient`, soft gradient, shadow
- Headers: elevated style on Collect, Live, Stats, Tools
- Cards: theme shadow tweaks
- New `components/AnnouncementTicker.tsx`; Live uses it, RECOLLECT first when pending, priority styling

## New dependency

After applying, install the new dependency:

```bash
npm install
# or
bun install
```

(`expo-linear-gradient` is in `package.json`.)
