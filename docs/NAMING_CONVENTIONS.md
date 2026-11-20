# Naming conventions

SwiftChain uses predictable names so imports remain searchable as the feature set grows.

- React component files use `PascalCase.tsx`.
- Hooks start with `use` and use `camelCase.ts` or `camelCase.tsx`.
- Service modules use `camelCaseService.ts`.
- Route segments and non-component directories use lowercase kebab-case.
- Public module entry points use `index.ts`; avoid deep imports when an entry point exists.

Run `pnpm lint:names` when adding or moving components, hooks, or services. Existing legacy names can be migrated incrementally; new files must follow these rules.
