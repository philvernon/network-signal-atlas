Build this app as maintainable React, not a large HTML template inside JSX.

- Use focused, named components for meaningful UI sections and interactions.
- Keep page-level components primarily responsible for composing those components.
- Use explicit typed props and clear state ownership.
- Separate data access and domain calculations from presentation.
- Write readable multiline JSX; do not compress markup or handlers.
- Run Oxfmt on generated files.
- Run Oxlint, strict TypeScript checks and relevant tests; fix findings rather
  than disabling checks.
- Before finishing, review the source for oversized components, tangled state,
  duplicated markup and complex inline conditionals, and correct them.

## Required skills

Use these skills as engineering guidance, not prescribed product architecture or
visual identity. Preserve the app’s chosen components, theme and data foundations.
Do not add dependencies or providers merely because a skill’s examples use them.

When creating or materially changing application UI:

- Read and apply react-patterns, vercel-composition-patterns and
  tailwind-design-system before implementation.
- Review the result using web-design-guidelines and avoid-ai-design before handing back.
- If required skills are missing, restore them using pnpm skills:sync; do not silently skip them.
- Apply repository and task requirements over example architectures, palettes,
  dependencies or framework-specific advice in these skills.

## Components and themes

- `@des/ui` is available, not a mandatory component catalogue. Reuse public components
  when they fit; build app-local React components or use accessible headless primitives
  when that better serves the app.
- The Official theme is optional, not a requirement or an acceptance criterion. This
  starter does not import it or `@des/ui/styles.css`. Do not add it automatically.
- You may create a coherent app-local theme, including typography, colour roles,
  spacing, surfaces and interaction states. Keep app-specific design in this app;
  do not create a shared design framework for it.
- Shared components do not import their own theme. If you use them, register their
  Tailwind sources and provide the semantic tokens they need in the app's stylesheet.
  See the README before opting into the shared stylesheet, which loads Official defaults.

## Control choice

- Do not default every selection to a dropdown.
- Use visible choices for small, frequently changed option sets.
- Use searchable, context-rich pickers for large collections.
- Use lists, trees, tables or plotted marks when selection benefits from seeing surrounding evidence.
- Remove options that do not support a meaningful user decision.
- Native controls remain appropriate where they are the best fit; custom appearance alone is not an improvement.

## Chart interaction

- Design pointer, touch and keyboard inspection as one coherent interaction system.
- Distinguish transient preview from pinned selection.
- Keep exact readings in a stable inspector rather than relying exclusively on moving tooltips.
- Coordinate focus, time cursors and selection across related charts, legends and evidence tables.
- Do not add a permanently visible sample slider by default. Provide an accessible inspection path appropriate to the chart, with explicit stepping controls where useful.
- Distinguish sample inspection from range selection and zoom; provide clear reset and escape actions.

## React composition

- Build focused, typed React components around meaningful domain interactions.
- Reuse accessible headless primitives for complex behaviour; do not recreate focus management or keyboard patterns.
- Keep product-specific components app-local. Reusable headless primitives may be added to `@des/ui` when first required; higher-level shared compositions require demonstrated reuse.
- Do not add a library merely to reproduce its demo or default aesthetic.

### Headless primitives

- Prefer existing `@des/ui` components and Radix Primitives. Agents may install task-needed Radix dependencies in `packages/ui` and add public exports; this is authorised shared-UI scope.
- Keep new wrappers headless or minimally styled, with composable parts, refs and styling hooks. Preserve existing APIs and styling; run applicable shared-UI checks.
- Keep product styling, domain state and routing app-local. Do not scaffold a component catalogue or introduce a competing library without a concrete capability gap.
- Match semantics: action menus are not selection controls. Do not force an unsuitable primitive where Radix lacks a capability.

## Visual direction

- Establish a deliberate hierarchy, typography, density, surface treatment and interaction language.
- Give the principal evidence more prominence than its controls.
- Avoid repetitive card grids, indiscriminate pills, decorative icons and generic dashboard chrome.
- Express originality through composition, evidence presentation and interaction—not arbitrary effects.

## Tests

- Vitest, jsdom and React Testing Library are declared in this app's dev dependencies.
- Run `pnpm test` from this app for its unit/component tests; `pnpm test:watch` watches
  them. The root test suite also discovers tests under this app's `src` directory.
- Add focused tests as behaviour is implemented; keep launcher capture separate from
  unit tests and never use it as proof of live-service acceptance.
