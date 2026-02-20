# p-adic Free-Form Workbench Plan

## Goal
Add a p-adic free-form circuit workspace with interaction parity to the current complex-number free-form workspace, while preserving existing behavior.

## Locked Inputs From You
1. Use the free-form circuit experience as the model.
2. Start at 2 qubits by default.
3. Allow qubit count from 1 to 8 (subtract/add controls).
4. Support prepared initial states.
5. Expose the same gate set used in the current free-form circuit.
6. Add p-adic prime selector limited to `p in {2, 3, 5, 7}`.
7. p-adic is a new top-level workspace tab.
8. Prepared-state controls: use Bloch-like controls if available; otherwise use explicit amplitude entry.
9. Gate palette behavior matches normal free-form: unavailable gates are not shown.
10. Custom gate builders are deferred to v2.
11. p-adic measurement semantics are user-selectable.

## Current Free-Form Surfaces To Mirror
- `/Users/demouser/Code/entangled-graphs/src/components/FreeFormWorkbench.vue`
- `/Users/demouser/Code/entangled-graphs/src/components/PrepPanel.vue`
- `/Users/demouser/Code/entangled-graphs/src/components/CircuitPanel.vue`
- `/Users/demouser/Code/entangled-graphs/src/components/MeasurementPanel.vue`
- `/Users/demouser/Code/entangled-graphs/src/state/*`
- `/Users/demouser/Code/entangled-graphs/src/quantum/*`

## Phase 1: Product Definition + UX Contract
### Work
1. Define top-level navigation integration for a new `p-adic` workspace tab.
2. Define p-adic control surface: prime selector (`2,3,5,7`) and visibility rules.
3. Define prepared-state UX decision boundary:
   - Bloch-like controls if valid/available for chosen p-adic representation.
   - explicit amplitude entry otherwise.
4. Define gate visibility contract: show only available gates in palette (hide unavailable).
5. Define p-adic measurement model selector UX and option list.
6. Define persisted settings (workspace selection, prime, measurement model, p-adic panel state).

### Deliverable
1. Approved UX contract document with screen-level behavior for Prep/Circuit/Measurement.
2. Final state/config schema for p-adic mode and persistence keys.
3. Finalized prepared-state control path (`Bloch-like` or `explicit amplitude`) with rationale.
4. Finalized measurement-model selector options for v1.
5. Phase 1 contract artifact: `/Users/demouser/Code/entangled-graphs/docs/current-plans/p-adic-phase1-ux-contract.md`.

## Phase 2: Shared State Model + Mode Plumbing
### Work
1. Add p-adic workspace/mode state to store without changing existing complex mode behavior.
2. Add `prime` state constrained to `{2,3,5,7}` with default value.
3. Add qubit-count state contract for p-adic mode with default 2 and bounds 1..8.
4. Add measurement-model selection state for p-adic mode.
5. Add persistence parsing/writing for the new workspace mode, prime, and measurement model.
6. Keep all new state paths feature-flagged from existing free-form until UI wiring is ready.

### Deliverable
1. Typed p-adic state model integrated in `src/state/`.
2. Persistence round-trip tests for mode + prime + measurement model + qubit count.
3. Existing free-form behavior unchanged in regression checks.

## Phase 3: p-adic Prep Panel (Qubit Setup)
### Work
1. Build p-adic Prep panel with qubit add/remove/count controls matching current free-form behavior.
2. Ensure default initialized state is 2 qubits.
3. Implement prepared-state editing UX for each qubit in p-adic mode:
   - Bloch-like controls if Phase 1 confirms availability.
   - explicit amplitude entry if Bloch-like controls are not available.
4. Add prepared-state presets for common basis/superposition starts (as agreed in Phase 1).
5. Add prime selector UI (`2,3,5,7`) and bind it to p-adic state.

### Deliverable
1. Interactive p-adic prep experience with:
   - default 2 qubits,
   - bounded count 1..8,
   - editable prepared states,
   - selectable prime from `{2,3,5,7}`.
2. Component tests for controls and state transitions.

## Phase 4: Circuit Builder Parity (Placement + Gates)
### Work
1. Reuse/extend circuit grid interactions for p-adic mode:
   - drag/drop single-qubit gates,
   - staged placement for CNOT/TOFFOLI/multi-wire,
   - measurement lock behavior.
2. Reuse same gate palette model as current free-form, filtered to p-adic-available gates only.
3. Ensure unavailable gates are hidden (not disabled) to match normal free-form behavior.
4. Exclude custom-operator builders from p-adic v1 paths; document v2 deferral boundary.

### Deliverable
1. p-adic circuit panel with functional parity to free-form interaction model.
2. Gate placement + row-lock behavior verified by interaction tests.

## Phase 5: p-adic Simulation + Measurement Path
### Work
1. Add p-adic simulation path for stage snapshots through circuit columns.
2. Add user-selectable measurement semantics for p-adic mode.
3. Add measurement distribution and sampling per selected measurement model.
4. Support in-circuit measurement outcomes and resample-from-point flow.
5. Ensure stage snapshots, selected stage, and final distribution are mode-aware.
6. Keep complex simulation path unchanged and isolated.

### Deliverable
1. End-to-end p-adic run path from prepared state to sampled measurement.
2. Measurement-model selector is functional and affects sampling/distribution results.
3. Snapshot and measurement tests passing for representative circuits.
4. Complex-mode simulation regression tests still passing.

## Phase 6: Visualization Parity (Inspector + Entanglement + Stage Views)
### Work
1. Wire p-adic stage snapshots into `CircuitStageSnapshots` and `StageInspector`.
2. Add p-adic-aware formatting/labels for amplitudes/distributions.
3. Integrate entanglement overlays for p-adic stage data.
4. Ensure visualization semantics are clearly labeled where they differ from complex mode.

### Deliverable
1. p-adic stage visualization parity across circuit and measurement panels.
2. Visual regression coverage for stage selection and overlays.

## Phase 7: Hardening, Documentation, and Release Gate
### Work
1. Add targeted tests:
   - qubit count bounds and defaults,
   - prime selector bounds,
   - measurement model selection and persistence,
   - gate interaction parity,
   - p-adic sampling determinism/replay behavior.
2. Add regression suite coverage to prevent complex-mode breakage.
3. Update README with p-adic workspace usage and constraints.
4. Add known-limitations section for p-adic mode.

### Deliverable
1. Full green test suite with added p-adic coverage.
2. Updated docs and usage notes.
3. Merge-ready p-adic free-form feature behind agreed rollout toggle or release condition.

## Open Clarifications Needed Before Phase 1 Sign-off
1. None currently.
