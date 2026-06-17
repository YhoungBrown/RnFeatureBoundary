# Maintenance Guide

This document is for maintainers and future contributors. It explains how the template packaging works and how to keep it healthy as React Native evolves.

---

## How the Template Works

The repository has two layers:

1. **Packaging layer (root)** — Contains `package.json` (npm metadata), `template.config.js` (React Native CLI instructions), and `README.md`.
2. **App layer (`template/` )** — Contains the actual React Native project that gets copied into a user's machine when they run `npx @react-native-community/cli init MyApp --template feature-boundary`.

### `template.config.js`

```js
module.exports = {
  placeholderName: 'RnFeatureBoundary',
  templateDir: 'template',
  postInitScript: './scripts/postInit.js',
};
```

- `placeholderName`: The string the React Native CLI searches for inside `template/` and replaces with the user's project name (e.g., `MyApp`).
- `templateDir`: The folder containing the app boilerplate.
- `postInitScript`: A script that runs **after** the CLI copies files and performs basic string replacement.

---

## `postInit.js` Design

`template/scripts/postInit.js` is a **discovery-based, fail-soft** script. It does not assume hardcoded paths.

### What it does

1. **Discovers `MainActivity.kt` or `MainActivity.java`** recursively inside `android/app/src/main/`.
2. **Extracts the current package name** via regex (`package com.something`).
3. **Replaces the last segment** of the package with the lowercased project name.
4. **Renames the directory** on disk to match the new package segment.
5. **Renames the iOS app directory** (`ios/RnFeatureBoundary/` → `ios/MyApp/`).
6. **Replaces any remaining placeholder references** in iOS files (`.pbxproj`, `.xcscheme`, `Podfile`, etc.).
7. **Self-destructs** — removes its own file and the `scripts/` folder so users never see it.

### Why discovery-based?

If React Native moves `MainActivity.kt` from `java/com/oldname/` to `kotlin/com/oldname/` in a future release, the script still works because it searches the entire `android/` tree rather than assuming a path.

### Fail-soft behavior

Every major block is wrapped in a `try/catch`.

- If Android files are missing or unrecognizable, the script warns the user and skips Android.
- If iOS files are missing, the script warns and skips iOS.
- The generated project is still usable; it just retains the fallback package name (`com.rnfeatureboundary`).

This prevents the template from becoming completely unusable if React Native restructures its native project layout.

---

## Updating for Future React Native Versions

### Scenario: RN moves native files to a new location

**You do not need to change anything** unless the discovery logic can no longer find the files.

If the script starts failing in CI:

1. Run the canary workflow locally or check the latest canary run logs.
2. See if `MainActivity.kt` or `MainActivity.java` is now located somewhere unexpected (e.g., under `android/app/src/main/kotlin/` but with a different nesting pattern).
3. Update the `walkDir` or regex logic in `postInit.js` to match the new pattern.
4. Test by generating a project locally:
   ```sh
   npx @react-native-community/cli init TestApp --template file:./
   ```

### Scenario: The script becomes unmaintainable

This is the **nuclear option**. You can disable the automation entirely:

1. Edit `template.config.js`:
   ```js
   module.exports = {
     placeholderName: 'RnFeatureBoundary',
     templateDir: 'template',
     // postInitScript removed
   };
   ```
2. Delete `template/scripts/postInit.js`.
3. Update `README.md` to tell users they must run `react-native-rename` manually if they want to customize the native package name.

The template is still usable; it simply loses the zero-friction renaming.

---

## CI Overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Validate | `.github/workflows/validate.yml` | Every PR | Generates a test project from the local template, verifies renamed structure, runs `npm run lint` |
| Publish | `.github/workflows/publish.yml` | Merge to `main` | Bumps version (patch/minor/major from commit message tag), publishes to npm |
| Canary | `.github/workflows/canary.yml` | Monthly cron | Generates from the **published** template and verifies the full structure still works |

---

## Version Bumping Rules

When merging a PR into `main`, include one of these tags in the merge commit message:

| Tag | Result | When to use |
|-----|--------|-------------|
| *(no tag)* | `patch` bump | Bug fixes, doc updates, script tweaks |
| `[minor]` | `minor` bump | New feature sample, new shared component, new script command |
| `[major]` | `major` bump | Breaking change to template contract (folder structure change, removed feature, etc.) |

The publish workflow scans the latest commit message and applies the appropriate `npm version` bump.
