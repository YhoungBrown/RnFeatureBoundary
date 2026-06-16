# Agent Guide

## Project Architecture

This is a React Native CLI template enforcing **feature-based boundaries** via ESLint.

### Folder Rules

- `src/features/<name>/` — Business domains.
  - `index.ts` is the **public API**.
  - Everything else is **internal**.
- `src/shared/` — Reusable code importable from anywhere. **No barrel `index.ts`.**
- `src/navigation/` — Router wiring. Empty by default.

### Import Conventions

| Context | Import Target | Example |
|---------|---------------|---------|
| Inside a feature, importing same feature | internal file | `./screens/HomeScreen` |
| Inside a feature, importing another feature | public API only | `../../user` |
| Navigation | feature public API | `../features/home` |
| App.tsx / root files | anything | `./src/features/home` or `../shared/...` |

### Feature Creation Checklist

1. Create folder under `src/features/<name>/`.
2. Add internal files (`screens/`, `hooks/`, `types/`, etc.).
3. Create `index.ts` exporting only what is public.
4. Add tests under `src/features/<name>/__tests__/`.
5. Run `npm run lint` to verify boundary compliance.

### Common Pitfalls

- **Deep imports across features** — always import from `../<feature>` (resolves to `index.ts`), never from `../<feature>/hooks/...`.
- **Adding `src/shared/index.ts`** — not needed; import directly from `src/shared/components/...` or `src/shared/types/...`.
- **Forgetting `index.ts` in a new feature** — without it, nothing can legally import from that feature.
- **Path aliases** — avoid unless absolutely necessary; they complicate the boundaries resolver.
