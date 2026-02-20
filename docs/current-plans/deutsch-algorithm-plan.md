# Deutsch Algorithm Page Plan

## Goal
Add a new `Deutsch` algorithm page under `Algorithms` (next to `Teleportation`) that:
1. Reuses existing algorithm/circuit visualization assets.
2. Lets the user select oracle behavior.
3. Clearly shows how Deutsch’s algorithm evaluates both inputs in superposition and resolves to constant vs balanced in one oracle call.

## Scope Constraints
1. Prefer shared components/composables over copy-paste from teleportation.
2. Keep the Deutsch circuit structure fixed except oracle behavior selection and input-state controls.
3. Keep existing Free-Form and Teleportation behavior unchanged.

## Locked Decisions
1. Oracle set: standard four only for now: `f(x)=0`, `f(x)=1`, `f(x)=x`, `f(x)=¬x`.
2. Initial setup:
   - default prepared state is `|0⟩|0⟩`.
   - circuit includes explicit initial `X` gate on the bottom qubit before Hadamards.
   - user can still edit both input qubits.
3. Output emphasis:
   - decision qubit (`q0`) is primary verdict.
   - full 2-qubit output distribution remains visible.
4. Interaction modes:
   - explicit oracle selection mode.
   - additional optional `Guess the Oracle` mode.

## Phase 1: Algorithm Shell + Navigation Wiring
### Work
1. Extend algorithm routing/state types to include `deutsch`.
2. Update algorithm persistence parsing/writing to round-trip `deutsch`.
3. Add `Deutsch` sub-tab in `AlgorithmsWorkbench`.
4. Add `DeutschScaffold.vue` with placeholder 3-panel layout matching algorithm workspace style.
5. Extract any immediate shared UI primitives needed by both teleportation/deutsch tabs.

### Deliverable
1. `Algorithms` shows two tabs: `Teleportation` and `Deutsch`.
2. Tab selection persists through refresh.
3. Deutsch scaffold renders without affecting other views.

### Stop Point
Manual review of navigation/state persistence before algorithm math.

## Phase 2: Deutsch Engine + Oracle Model
### Work
1. Add Deutsch model types (`OracleId`, stage metadata, result classification).
2. Build 2-qubit oracle operator constructors for the selected oracle behavior.
3. Implement fixed Deutsch stage simulation pipeline:
   - Prep (`|0⟩|0⟩` by default, editable inputs)
   - Initial `X` on bottom qubit
   - Hadamards
   - Oracle `U_f`
   - Final Hadamard on decision qubit
4. Compute expected decision (`constant` vs `balanced`) and sampled output.
5. Add deterministic tests for all oracle options and classification correctness.

### Deliverable
1. Engine returns stable stage snapshots and final decision for each oracle.
2. Tests prove correctness for the 4 canonical oracles.

### Stop Point
Manual correctness review of stage outputs and decision logic.

## Phase 3: Deutsch UI (Reusable Panels)
### Work
1. Implement `useDeutschModel` composable, reusing shared simulation/entanglement helpers.
2. Build Deutsch panels:
   - Left: oracle selector, mode selector, input controls, stage intent.
   - Center: fixed circuit timeline + stage snapshots + inspector (reused components).
   - Right: expected vs sampled result, constant/balanced verdict.
3. Keep gate placement locked; oracle behavior changes update the underlying `U_f`.
4. Reuse existing entanglement overlays/legend behavior where applicable.

### Deliverable
1. Fully interactive Deutsch page with live oracle switching.
2. Inputs are editable while circuit skeleton remains fixed.
2. No duplicated teleportation logic for shared concerns (overlay/legend/snapshots).

### Stop Point
Manual UX review of clarity and consistency with Teleportation tab.

## Phase 4: “All Inputs At Once” + Guess Mode
### Work
1. Add a dedicated visualization for the oracle-action stage showing simultaneous `x=0` and `x=1` contributions.
2. Present phase-kickback/interference explicitly (not only final probabilities), tied to selected oracle.
3. Add `Guess the Oracle` mode:
   - hide oracle identity until user submits a guess
   - keep algorithm outputs visible for inference
   - reveal oracle and correctness after submission
4. Keep visualization compact and synchronized with selected stage.
5. Add tests for derived values feeding visualization and guess-mode state transitions.

### Deliverable
1. Users can see both input paths represented concurrently and how interference yields the final decision.
2. Visualization updates correctly across all oracle choices.
3. Guess mode is playable and reveals correctness deterministically.

### Stop Point
Manual pedagogy review: “processes all inputs at once” should be visually unambiguous.

## Phase 5: Hardening + Documentation
### Work
1. Add regression tests for:
   - algorithm tab persistence with `deutsch`
   - oracle switching stability
   - sampled vs expected decision consistency
   - guess-mode reveal/reset behavior
2. Refactor any residual duplicated algorithm-view logic into shared modules.
3. Update README algorithm section with Deutsch workflow and interpretation notes.

### Deliverable
1. Full test pass with Deutsch coverage.
2. Clean shared architecture across algorithm tabs.
3. User docs updated for Deutsch.

### Stop Point
Ready for implementation sign-off.
