# p-adic Workspace Phase 1 UX Contract

## Scope
This document is the Phase 1 deliverable for the p-adic workspace effort. It defines screen-level behavior and the state/persistence contract, without implementation details.

## Locked Decisions
1. p-adic is a new top-level workspace tab.
2. p-adic qubit count starts at 2 and is bounded to 1..8.
3. Prime selector is restricted to `{2, 3, 5, 7}`.
4. Gate visibility follows free-form behavior: unavailable gates are not shown.
5. Custom gate builders are out of scope for v1.
6. p-adic measurement semantics are user-selectable.

## 1) Navigation Contract

## Top-level tabs
1. `Free-Form` (existing complex workspace)
2. `p-adic` (new)
3. `Algorithms` (existing)

Behavior:
1. Tab selection is persistent across reloads.
2. p-adic workspace keeps independent state from complex free-form workspace.

## 2) p-adic Screen Contract

The p-adic workspace keeps the same 3-panel layout pattern:
1. `Prepared State`
2. `Quantum Circuit`
3. `Measurement`

## 2.1 Prepared State panel
Controls:
1. Qubit controls identical interaction pattern as current free-form:
   - `- Qubit`, `Qubit Count`, `+ Qubit`
   - bounded to `1..8`
   - default value `2`
2. Prime selector:
   - visible as a compact segmented control or dropdown
   - allowed values: `2`, `3`, `5`, `7`
3. Prepared-state editor per qubit:
   - **v1 decision:** explicit amplitude entry (Bloch-style controls are not used in v1)

Rationale for prepared-state input path:
1. The p-adic reference model does not provide a direct compact Bloch-sphere analogue matching current complex controls.
2. Explicit amplitude entry avoids implying complex-Bloch geometry in p-adic mode.
3. Bloch-like visual controls remain possible as a future derived/proxy view, but not as canonical input in v1.

Prepared-state presets:
1. Include basis presets (`|0>`, `|1>`).
2. Include at least one balanced/symmetric preset where representable under selected p-adic model.
3. Preset availability is model-aware and deterministic.

## 2.2 Quantum Circuit panel
Controls and interaction parity:
1. Column add/remove behavior matches free-form.
2. Placement interactions match free-form:
   - drag/drop single-qubit gates
   - staged placement for multi-wire gates
   - measurement lock behavior on measured rows

Gate visibility contract:
1. Palette uses the same gate catalog as free-form.
2. Palette filters to gates available under current p-adic settings.
3. Unavailable gates are hidden (not disabled).
4. Custom gate creation UI is not shown in p-adic v1.

## 2.3 Measurement panel
Controls:
1. `Measure` and sample history behavior matches free-form.
2. In-circuit measurement outcomes and resample-from-point behavior match free-form.
3. A measurement-model selector is visible and applies immediately.

Measurement-model selector (v1 set):
1. `valuation_weight`
2. `character_based`
3. `operator_ensemble`

Model UX requirements:
1. Current model is always visible.
2. Distribution/sample views are labeled with active model.
3. Model change invalidates stale sampled branch views and recomputes outputs.

## 3) State Contract (Phase 1 schema)

## 3.1 Workspace mode
```ts
type WorkspaceMode = "free-form" | "p-adic" | "algorithms";
```

## 3.2 p-adic workspace state
```ts
type PAdicPrime = 2 | 3 | 5 | 7;

type PAdicMeasurementModel =
  | "valuation_weight"
  | "character_based"
  | "operator_ensemble";

type PAdicAmplitudeInput = {
  raw: string; // user-entered p-adic amplitude text
};

type PAdicPreparedQubit = {
  a: PAdicAmplitudeInput;
  b: PAdicAmplitudeInput;
};

type PAdicWorkspaceState = {
  prime: PAdicPrime;
  measurementModel: PAdicMeasurementModel;
  qubitCount: number; // clamped 1..8, default 2
  preparedQubits: PAdicPreparedQubit[]; // length equals qubitCount
  columns: CircuitColumn[]; // same structure as free-form
  selectedStageIndex: number;
};
```

Notes:
1. `raw` amplitude strings preserve user intent and allow deferred parser evolution without breaking persisted data.
2. Circuit placement semantics remain aligned with existing free-form contracts.

## 4) Persistence Contract (Phase 1)

## Existing key reuse
1. `/Users/demouser/Code/entangled-graphs/src/app/persistence.ts` key `entangled.workspace.mode` now accepts `"p-adic"`.

## New p-adic keys
1. `entangled.padic.prime`
2. `entangled.padic.measurement-model`
3. `entangled.padic.qubit-count`
4. `entangled.padic.prepared.v1`
5. `entangled.padic.selected-stage`

Persistence requirements:
1. Invalid persisted prime falls back to `2`.
2. Invalid persisted measurement model falls back to `valuation_weight`.
3. Invalid qubit count is clamped to `1..8`, default `2`.

## 5) Acceptance Criteria for Phase 1 Completion
1. Navigation behavior and p-adic tab semantics are documented and approved.
2. Prep/Circuit/Measurement screen contracts are documented and approved.
3. Prepared-state input path for v1 is finalized (`explicit amplitude entry`).
4. v1 measurement model set is finalized (`valuation_weight`, `character_based`, `operator_ensemble`).
5. State and persistence schema are documented with fallback/clamp rules.
