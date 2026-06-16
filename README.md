# RnFeatureBoundary

A **React Native CLI template** that enforces a strict **feature-based architecture** through ESLint rules. Every feature is self-contained under `src/features/<name>/` and exposes a public API via `index.ts`. Other features, shared code, and navigation can only interact through these public boundaries.

---

## Table of Contents

- [Installation](#installation)
- [Architecture Overview](#architecture-overview)
- [Folder Structure](#folder-structure)
- [Boundary Rules](#boundary-rules)
- [Adding a New Feature](#adding-a-new-feature)
- [How to Import Correctly](#how-to-import-correctly)
- [Navigation](#navigation)
- [Testing](#testing)
- [Publishing as an npm Template](#publishing-as-an-npm-template)
- [Troubleshooting](#troubleshooting)

---

## Installation

Use the React Native CLI to scaffold a new project from this template:

```sh
npx @react-native-community/cli init MyApp --template feature-boundary
```

---

## Architecture Overview

```
src/
├── features/          # Business domains (home, user, profile, settings, ...)
│   ├── home/
│   │   ├── __tests__/      # All tests for this feature
│   │   ├── screens/        # Screens owned by this feature
│   │   └── index.ts        # Public API: what other features may consume
│   ├── user/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── index.ts
│   ├── profile/
│   │   ├── screens/
│   │   └── index.ts
│   └── settings/
│       ├── screens/
│       └── index.ts
├── navigation/        # Router setup (empty by default; bring your own)
└── shared/            # Reusable UI / utilities (no barrel file)
    ├── components/
    └── types/
```

- **`src/features/<name>/index.ts`** is the **only** contract other code may use.
- **`src/shared/`** can be imported from anywhere, including `App.tsx`.
- **`src/navigation/`** is left empty so you can install any navigation solution.

---

## Boundary Rules

ESLint (`eslint-plugin-boundaries`) enforces the following import constraints:

| From                                   | Can import                                                       |
| -------------------------------------- | ---------------------------------------------------------------- |
| Any file in `src/`                     | `shared`, `navigation`                                           |
| `navigation`                           | `feature-public` (screens via `index.ts`)                        |
| `feature-internal` (same feature)      | `feature-internal` (same feature)                                |
| `feature-internal` (different feature) | `feature-public` only                                            |
| `feature-public`                       | `feature-internal` (own feature), `feature-public` (any feature) |

**Root files** (`App.tsx`, `index.js`, etc.) are outside the boundary model and can import anything freely.

---

## Adding a New Feature

1. Create the folder:

   ```sh
   mkdir src/features/myFeature
   ```

2. Add internal files (screens, hooks, types, etc.):

   ```sh
   mkdir src/features/myFeature/screens
   touch src/features/myFeature/screens/MyFeatureScreen.tsx
   ```

3. Create the public API:

   ```ts
   // src/features/myFeature/index.ts
   export { MyFeatureScreen } from './screens/MyFeatureScreen';
   ```

4. (Optional) Add tests:
   ```sh
   mkdir src/features/myFeature/__tests__
   touch src/features/myFeature/__tests__/MyFeatureScreen.test.tsx
   ```

---

## How to Import Correctly

### Valid

```ts
// From a screen inside 'profile' -> user public API
import { User } from '../../user';

// From navigation -> feature public API
import { HomeScreen } from '../features/home';

// From anywhere -> shared
import { Container } from '../shared/components/Container';
```

### Invalid (will fail lint)

```ts
// Deep import into another feature
import { useUser } from '../../user/hooks/useUser';

// Deep import into another feature's types
import { User } from '../../user/types/userTypes';
```

**ESLint error you will see:**

> Architecture violation: features may depend on other features only through their public API. Feature "profile" cannot import internal files from feature "user". Replace the deep import with an import from `src/features/user/index.ts`.

---

## Navigation

No navigation library is pre-installed. Install whichever you prefer and wire screens by importing them from the feature public APIs.

See `src/navigation/README.md` for the golden rule.

---

## Testing

Tests live inside each feature at `src/features/<name>/__tests__/`. There is no root `__tests__` folder.

**Example:**

```ts
// src/features/home/__tests__/HomeScreen.test.tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { HomeScreen } from '..';

describe('HomeScreen', () => {
  it('renders correctly', () => {
    ReactTestRenderer.create(
      <HomeScreen safeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }} />,
    );
  });
});
```

Run all tests:

```sh
npm test
```

## Note

- On every commit, **Prettier** and **ESLint** checks are run automatically. If they fail, the commit is blocked.
- On every push, the test suite is run automatically. If any test fails, the push is blocked.

Only commits and pushes that pass all configured checks are allowed to proceed.

---

## Publishing as an npm Template

To make the template installable via `npx @react-native-community/cli init MyApp --template RnFeatureBoundary`, you must publish it as an npm package.

### Option A: Publish with the exact package name

1. Rename the package in `package.json` to `RnFeatureBoundary`.
2. Create a `template/` directory at the repo root.
3. Move **all project source files** (everything except docs and packaging metadata) into `template/`.
4. Create `template.config.js` at the repo root:
   ```js
   module.exports = {
     placeholderName: 'RnFeatureBoundary',
     templateDir: 'template',
   };
   ```
5. Publish:
   ```sh
   npm publish
   ```

Users then run:

```sh
npx @react-native-community/cli init MyApp --template RnFeatureBoundary
```

### Option B: Use the `react-native-template-` prefix (legacy convention)

1. Rename the package in `package.json` to `react-native-template-feature-boundary`.
2. Follow the same `template/` + `template.config.js` steps above.
3. Publish:
   ```sh
   npm publish --access public
   ```

Users then run:

```sh
npx @react-native-community/cli init MyApp --template feature-boundary
```

### Important

Do **not** publish from this flat repo structure directly. The React Native CLI expects either a `template/` subdirectory or a `template.config.js` pointing to the correct directory.

---

## Troubleshooting

**Q: ESLint shows `boundaries/no-unknown` for a new file I created.**  
A: Make sure the file sits inside one of the recognized folders:

- `src/features/<name>/` for features
- `src/shared/` for shared code
- `src/navigation/` for navigation setup

Files outside `src/` or in unlisted folders inside `src/` are treated as unknown by the boundary plugin. if its a new folder you can add it in the `eslint.config.mjs` under setting in boundaries/elements array

**Q: Can I add path aliases (e.g. `@/features/home`)?**  
A: Yes, but the template intentionally avoids them to keep compatibility high. If you add aliases, you must also configure `babel-plugin-module-resolver` and ensure the ESLint `import/resolver` understands them so that `eslint-plugin-boundaries` still classifies files correctly.
