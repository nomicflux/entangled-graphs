# p-adic Visualization Math Plan

## Goal
Make p-adic mode visually express p-adic mathematics directly in the UI, not just circuit parity with different labels.

## Non-Negotiable Product Constraint
The p-adic workspace must visibly expose p-adic values and p-adic structure at every stage:
1. Show p-adic quantities (`v_p`, `|x|_p`, residue/base-`p` digits, model weight `w_p`) as first-class UI data.
2. Use p-adic geometry (ultrametric/fractal/ring structure) as the main state visualization.
3. Keep standard probability-style views secondary and clearly marked as derived from selected p-adic model.

## Inputs Incorporated
1. Existing p-adic references in `/Users/demouser/Code/entangled-graphs/docs/p-adic-qubits-reference.md`.
2. The provided external visualization logic pattern (digit-vector and valuation-ring geometry), adapted for circuit-stage transitions and measurement branching.

## Phase 1: Mathematical UI Contract
### Work
1. Define the exact p-adic metrics shown per basis state and per stage.
2. Define canonical field names and formulas used in UI copy/tooltips.
3. Define which values are primary vs derived to prevent ambiguity.
4. Define labeling policy so users can always tell `P` vs `w_p`.

### Required Visible Metrics
1. `basis`: computational basis label.
2. `w_p(basis)`: normalized model weight for selected measurement model.
3. `v_p(w_raw)`: valuation of pre-normalized basis weight.
4. `|w_raw|_p = p^{-v_p(w_raw)}`.
5. `residue_p`: residue class used by character/ring mapping.
6. `digits_p(index)`: base-`p` expansion used by fractal placement.

### Deliverable
1. Signed-off metric/notation spec with formulas and tooltip copy.
2. UI glossary block for p-adic workspace terms.
3. Contract file update in `/Users/demouser/Code/entangled-graphs/docs/current-plans/p-adic-phase1-ux-contract.md` (appendix section).

## Phase 2: p-adic Visualization Data Model
### Work
1. Add stage-level derived visualization payload for every p-adic stage:
   - node metrics table,
   - geometry coordinates per mode,
   - edge/transition weights.
2. Add deterministic cache + invalidation rules keyed by:
   - prime, qubit count, measurement model, columns, selected stage, geometry mode.
3. Expose selectors for:
   - node list,
   - transition list,
   - stage-to-stage interpolation payload,
   - selected-node detail panel.

### Deliverable
1. Stable typed visualization model in state/selectors.
2. Unit tests for determinism, cache invalidation, and metric consistency.

## Phase 3: p-adic Value Inspector (No Geometry Yet)
### Work
1. Add a dedicated inspector panel that renders p-adic metrics table per stage.
2. Add basis-row drilldown with expanded details:
   - raw weight before normalization,
   - normalized `w_p`,
   - valuation/norm/residue/digits.
3. Add explicit badges:
   - `Primary p-adic metric`
   - `Derived model metric`

### Deliverable
1. Interactive p-adic value inspector in workspace.
2. Snapshot tests for stage changes, prime changes, model changes.

## Phase 4: Geometry Mode A (`padic_vector`) Fractal Embedding
### Work
1. Implement base-`p` digit-vector embedding:
   - per-digit polar step,
   - decaying radius by digit depth,
   - summed cartesian point.
2. Render nodes with size/opacity by `w_p`.
3. Render optional transition links from previous stage to current stage.
4. Add viewport normalization and deterministic layout.

### Deliverable
1. Fractal-like p-adic map for each stage.
2. Visual tests that confirm geometry changes with `p`, while distributions stay unchanged.

## Phase 5: Geometry Mode B (`valuation_ring`) Ring Embedding
### Work
1. Implement valuation-ring embedding:
   - radius from valuation-derived metric,
   - angle from residue/index ordering.
2. Render concentric valuation structure with legend and tick labels.
3. Add mode toggle between `padic_vector` and `valuation_ring`.

### Deliverable
1. Ring-mode visualization with valuation legend.
2. Determinism tests for coordinates and ring assignment.

## Phase 6: Stage Transition + Branch Animation
### Work
1. Animate stage transitions (`t -> t+1`) using interpolation on shared node identity.
2. For measurement columns, animate branch split/merge with path highlighting.
3. Add replay controls:
   - play/pause transitions,
   - jump to measurement branch outcome,
   - resample-from-point visual replay.

### Deliverable
1. Transition animation layer synchronized with circuit stage selection.
2. Interaction tests for replay and branch-path consistency.

## Phase 7: Circuit Integration and UI Priority Shift
### Work
1. Promote p-adic geometry panel to primary center visualization in p-adic mode.
2. Keep Bloch/probability-style elements secondary and explicitly labeled as derived.
3. Integrate node hover/click selection with Stage Inspector + Measurement panel.
4. Add toggle for overlaying entanglement arcs on top of p-adic geometry.

### Deliverable
1. p-adic workspace where mathematical geometry is primary.
2. UX acceptance check: user can identify p-adic structure without reading code/docs.

## Phase 8: Hardening and Release Gate
### Work
1. Add correctness tests:
   - metric formula checks,
   - geometry determinism,
   - mode-switch semantic invariants,
   - branch replay determinism with fixed seed.
2. Add performance checks for up to 8 qubits (node count and animation budget).
3. Update docs and known limitations with explicit metric semantics.

### Deliverable
1. Green suite with p-adic visualization coverage.
2. Release checklist with explicit pass/fail criteria for math-visibility.

## Acceptance Criteria (Must All Pass)
1. A user can inspect `v_p`, `|.|_p`, `w_p`, and base-`p` digits for any displayed basis state.
2. Changing `p` visibly changes geometry layout in both modes.
3. Switching geometry mode changes coordinates only, not computed stage distributions.
4. Measurement branch replay changes branch paths while preserving pre-replay history.
5. p-adic view is visually distinguishable from normal free-form at first glance.

