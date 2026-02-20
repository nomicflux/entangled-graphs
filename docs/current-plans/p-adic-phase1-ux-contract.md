# p-adic Workspace Phase 1 UX Contract

## Scope
This document is the Phase 1 deliverable for the p-adic workspace effort. It defines screen-level behavior and the state/persistence contract, without implementation details.

This Phase 1 contract is visualization-first:
1. p-adic mode must show p-adic mathematical structure directly in UI.
2. p-adic values are not optional debug metrics; they are first-class display values.
3. Any probability-like display must be explicitly labeled as model-derived `w_p`, not implicit Born `P`.

## Locked Decisions
1. p-adic is a new top-level workspace tab.
2. p-adic qubit count starts at 2 and is bounded to 1..8.
3. Prime selector is restricted to `{2, 3, 5, 7}`.
4. Gate visibility follows free-form behavior: unavailable gates are not shown.
5. Custom gate builders are out of scope for v1.
6. p-adic measurement semantics are user-selectable.
7. p-adic visualization uses p-adic-native geometry modes, not only conventional bar charts.
8. p-adic values (`v_p`, `|.|_p`, residue, base-`p` digits, `w_p`) are mandatory UI outputs.

## 1) Navigation Contract

## Top-level tabs
1. `Free-Form` (existing complex workspace)
2. `p-adic` (new)
3. `Algorithms` (existing)

Behavior:
1. Tab selection is persistent across reloads.
2. p-adic workspace keeps independent state from complex free-form workspace.

## 2) p-adic Screen Contract

The p-adic workspace keeps the same 3-panel layout pattern, but p-adic state geometry is primary:
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

p-adic visualization placement:
1. The center panel includes a dedicated `p-adic State Map` surface tied to selected stage.
2. The `p-adic State Map` is primary visual focus for state structure.
3. Conventional snapshot bars/cards are secondary and explicitly marked as derived.

Geometry modes (v1 required):
1. `padic_vector` (digit-vector embedding):
   - coordinates derived from base-`p` digits of basis index/descriptor.
2. `valuation_ring` (valuation-residue embedding):
   - radius derived from valuation metric,
   - angle from residue/index ordering.

Geometry mode semantics:
1. Switching geometry mode changes coordinates only.
2. Switching geometry mode does not change computed stage weights/distributions.

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
2. Distribution/sample views are labeled with active model and `w_p` notation.
3. Model change invalidates stale sampled branch views and recomputes outputs.

Required p-adic value display:
1. Per displayed basis outcome, show:
   - `w_raw` (model raw weight, before normalization),
   - `w_p` (normalized model weight),
   - `v_p(w_raw)`,
   - `|w_raw|_p`,
   - residue class used for geometry/character mapping,
   - base-`p` digits used for `padic_vector` placement.
2. If a conventional probability view is shown, it must be visually and textually marked as derived/non-primary.

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
  geometryMode: "padic_vector" | "valuation_ring";
  qubitCount: number; // clamped 1..8, default 2
  preparedQubits: PAdicPreparedQubit[]; // length equals qubitCount
  columns: CircuitColumn[]; // same structure as free-form
  selectedStageIndex: number;
  selectedBasis?: string; // optional drilldown focus
};
```

Notes:
1. `raw` amplitude strings preserve user intent and allow deferred parser evolution without breaking persisted data.
2. Circuit placement semantics remain aligned with existing free-form contracts.
3. Visualization mode and selected basis focus are workspace-local p-adic state.

## 4) Persistence Contract (Phase 1)

## Existing key reuse
1. `/Users/demouser/Code/entangled-graphs/src/app/persistence.ts` key `entangled.workspace.mode` now accepts `"p-adic"`.

## New p-adic keys
1. `entangled.padic.prime`
2. `entangled.padic.measurement-model`
3. `entangled.padic.qubit-count`
4. `entangled.padic.prepared.v1`
5. `entangled.padic.selected-stage`
6. `entangled.padic.geometry-mode`
7. `entangled.padic.selected-basis`

Persistence requirements:
1. Invalid persisted prime falls back to `2`.
2. Invalid persisted measurement model falls back to `valuation_weight`.
3. Invalid qubit count is clamped to `1..8`, default `2`.
4. Invalid geometry mode falls back to `padic_vector`.

## 5) Mathematical Visualization Contract (Phase 1)

## 5.1 Canonical UI fields and formulas
For each basis row `b` at a selected stage:
1. `w_raw(b)`: model raw basis weight before normalization.
2. `Z = sum_b w_raw(b)`.
3. `w_p(b) = w_raw(b) / Z` (if `Z = 0`, all displayed weights are `0`).
4. `v_p(x)`:
   - exact p-adic valuation for representable numeric domain,
   - `v_p(0) = +infinity`.
5. `|x|_p = p^{-v_p(x)}` with `|0|_p = 0`.
6. `residue_p(b)`: residue class used by ring/character placement.
7. `digits_p(b)`: base-`p` expansion used by digit-vector placement.

## 5.2 Labeling policy
1. `w_p` is the default distribution symbol in p-adic workspace.
2. `P` cannot be shown as a primary label in p-adic workspace.
3. Any non-p-adic derived view must include a `Derived` badge.
4. Tooltips must include active `p` and active measurement model.

## 5.3 Visual-priority policy
1. p-adic geometry (`padic_vector` / `valuation_ring`) is primary.
2. Bar/list distributions are secondary summaries.
3. Stage inspector must expose valuation/norm/digits/residue without additional toggles.

## 6) UI Glossary (Phase 1)
1. `w_raw`: unnormalized model weight for a basis state.
2. `w_p`: normalized model weight used for p-adic measurement display.
3. `v_p`: p-adic valuation (power of prime `p` in a value).
4. `|.|_p`: p-adic norm derived from valuation.
5. `Residue class`: basis-associated modular class used for angular placement.
6. `Base-p digits`: digit expansion used by fractal/digit-vector embedding.
7. `padic_vector`: geometry from digit-vector summation.
8. `valuation_ring`: geometry from valuation radius and residue angle.

## 7) Acceptance Criteria for Phase 1 Completion
1. Navigation behavior and p-adic tab semantics are documented and approved.
2. Prep/Circuit/Measurement screen contracts are documented and approved.
3. Prepared-state input path for v1 is finalized (`explicit amplitude entry`).
4. v1 measurement model set is finalized (`valuation_weight`, `character_based`, `operator_ensemble`).
5. State and persistence schema are documented with fallback/clamp rules.
6. Required p-adic UI fields and formulas are documented and approved.
7. Labeling policy (`w_p` primary, `P` non-primary) is documented and approved.
8. Geometry-mode contract (`padic_vector`, `valuation_ring`) is documented and approved.
