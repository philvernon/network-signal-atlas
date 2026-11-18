# Network Signal Atlas

A standalone distribution-network evidence application. Start with a network overview, follow an authored event to its cable or location, inspect physical sensor history, and compare the selected sample with current measurement fields.

## Running

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @des/network-signal-atlas dev
```

The normal app dev/preview port is **5122**, owned by `launcher/hosting.json` and `vite.config.ts`. Automation may override the process port; temporary worker ports are not deployment configuration. The app is independently served, not embedded in a shared production shell.

## Evidence sources

The initial **Demonstration** is explicitly labelled synthetic. It contains five locations, four cable assets, sixteen sensors/current measurements and eight authored events, fixed at **18 June 2026, 10:30 UTC**. It makes no backend requests. Example investigation:

1. Open **Event log → Foundry joint temperature outlier**.
2. Open **C02 · Canal — Foundry**, then the Foundry temperature sensor history.
3. Inspect the **09:30 UTC** sample (**74.2 °C**), compare another temperature sensor, or open the source distribution.
4. Follow **All exact measurement fields** to inspect the current **10:30 UTC** snapshot (**66.8 °C**).

**Live connection** uses the same-origin Grid Data API and session cookies through the repository Vite proxy conventions. Configure the target with the app's ignored `.env.local` or the hosting root `.env` as documented in the root README.

The data boundary uses public `@philvernon/grid-data-kit-core` normalizers, queries, selectors, relationship helpers and unit metadata. `/generated` imports stay in `src/data`. Event-resource failure is different from a successful empty log; optional topology failures and unresolved IDs remain visible. Multi-cable associations preserve explicit asset precedence. Snapshot timestamps describe returned readings rather than an invented network freshness claim.

Temperature, current and voltage expose supported physical histories. Strain, wavelength and DTS remain current evidence where the public history contract does not support them. Unknown event metric units stay unknown. Live histogram `Bin`/`Value` semantics cannot truthfully be projected to count buckets, so that control reports unavailability rather than fabricated data. Demonstration histograms are deterministic synthetic counts. No app-owned anomaly detector, diagnosis or operating threshold is applied: outliers are authored events.

## Navigation and chart inspection

The visible navigation links cover Overview, Event log, Assets & locations, Measurements and Investigation. Source mode, page and entity IDs are hash-backed, shareable and compatible with browser back/forward. Inventory, event and measurement filters are local UI state.

D3 builds scales and paths while React owns chart structure and interactions. Charts retain source order in exact tables, preserve missing gaps and zeros, and mark authored event times. A compatible comparison uses the same physical unit.

- Pointer movement previews a sample; tapping/clicking pins it.
- Focus the chart and use arrow keys to preview, Home/End to jump, Enter to pin and Escape to clear.
- Previous/next and Unpin controls provide another keyboard/touch inspection path.
- Recent half and reset controls alter the view without changing the pinned evidence.
- The exact table and CSV export retain numeric precision, missing samples and source order.

The **Refresh snapshot** control refreshes current state and event-list evidence. History/detail resources have independent query lifecycles; a history failure exposes its own retry. No decorative motion is used.

## Checks

```sh
pnpm --filter @des/network-signal-atlas format:check
pnpm --filter @des/network-signal-atlas lint
pnpm --filter @des/network-signal-atlas typecheck
pnpm --filter @des/network-signal-atlas test
pnpm --filter @des/network-signal-atlas build
pnpm lint
pnpm test
pnpm build
pnpm build-storybook
pnpm launcher:validate
```

App tests cover source failures, public semantic adapters, connected deterministic fixtures, navigation, exact numeric precision, partial evidence, multi-cable associations and chart interaction. App-local Storybook stories cover overview, events, assets, measurements, investigation and missing/error/empty evidence.

`launcher/capture.spec.ts` uses the public isolated capture helpers and blocks unexpected external/backend traffic. It captures the populated overview and exercises the connected outlier journey, narrow keyboard chart inspection and a synthetic failed live service. It is synthetic acceptance, not proof of live-backend operation.
