# Lossless Stage Snapshot Refactor Plan

## Goal
Replace the current lossy stage-inspector data flow with a canonical, lossless stage snapshot pipeline so stage visuals can represent phase-sensitive distinctions that do not survive reduction to per-qubit Bloch vectors or basis distributions.

Primary product outcome:
1. In Free-form compare mode, `H(q0)`, `CNOT(q0, q1)` and `H(q0)`, `CNOT(q0, q1)`, `Z(q0)` must show a direct visual difference in stage snapshots and the Stage Inspector.
2. That difference must come from the stage graphic itself, not text, labels, classifications, legends, or badges.

## Root Cause
Current stage UI contracts reduce full state too early.

Today:
1. Stage simulation produces `StateEnsemble[]`.
2. Shared stage selectors/models immediately reduce each stage to:
   - basis distribution
   - per-qubit Bloch vectors
3. Shared stage components render from that reduced structure.

Failure mode:
1. `(|00> + |11>)/sqrt(2)` and `(|00> - |11>)/sqrt(2)` have the same basis distribution.
2. They also have the same single-qubit reduced Bloch vectors.
3. Therefore the current stage contract erases the phase distinction before the visual layer sees it.

This is an architectural bug, not a missing label problem and not primarily a CSS problem.

## Hard Constraints
1. Canonical stage data must preserve distinctions present in the simulated stage state.
2. Reductions belong at the consumer boundary, not in shared stage state.
3. The fix must produce strictly visual stage differences.
4. No textual or classificatory substitute is acceptable:
   - no Bell-name pills
   - no signature strips
   - no tooltips as the primary fix
   - no "extra explanatory" text standing in for the visual change
5. Shared stage components used by Free-form, Algorithms, Abstractions, and Error Codes must keep working after migration.

## Target Architecture

### Canonical Stage Type
Introduce a new canonical stage type:

```ts
type StageSnapshot = {
  id: string;
  index: number;
  label: string;
  ensemble: StateEnsemble;
  isFinal: boolean;
};
```

Properties:
1. It preserves the stage ensemble as the source of truth.
2. It does not embed view-specific reductions.
3. It is valid across all consumers that need different renderings from the same stage.

### Derived Stage Visual Model
Introduce a view-only stage visual derivation layer:

```ts
type StageVisualModel = {
  distribution: BasisProbability[];
  blochPair: BlochPair;
  qubitPhaseOverlays: ReadonlyArray<QubitPhaseOverlay>;
  pairPhaseOverlays: ReadonlyArray<PairPhaseOverlay>;
};
```

Properties:
1. It is derived from `StageSnapshot`.
2. It is disposable and consumer-specific.
3. It can evolve without changing canonical stage state.

### New Stage Graphic Boundary
Introduce a stage graphic component that accepts canonical stage state directly:

```ts
<StageStateView :stage="stageSnapshot" />
```

Properties:
1. It derives local Bloch visuals and nonlocal phase visuals internally.
2. It is the only stage graphic boundary for shared stage-inspector/snapshot use.
3. `BlochPairView` can remain as a narrower leaf primitive, but should no longer be the stage-inspector contract.

## Data Preservation Rule For This Refactor
At the stage layer:
1. `StateEnsemble` is canonical.
2. `distribution` is derived.
3. `blochPair` is derived.
4. phase-sensitive pairwise coherence visuals are derived.

Any shared stage type that omits `ensemble` is non-canonical.

## New Module Boundaries

### 1. Canonical Snapshot Producers
These files should produce `StageSnapshot[]`, not `StageView[]`:
1. `src/state/selectors.ts`
2. `src/components/abstractions/preparing-qubits/usePreparingQubitsModel.ts`
3. `src/components/abstractions/phase-kickback/usePhaseKickbackModel.ts`
4. `src/components/abstractions/entanglement/useEntanglementModel.ts`
5. `src/components/algorithms/deutsch/useDeutschModel.ts`
6. `src/components/algorithms/teleportation/useTeleportationModel.ts`
7. `src/components/error-codes/shared/useSingleErrorColumnModel.ts`

### 2. Stage Visual Derivation
Add a pure helper module:
1. `src/components/circuit/stage-visual-model.ts`

Responsibilities:
1. derive measurement distribution from `StageSnapshot`
2. derive local Bloch pair from `StageSnapshot`
3. derive pairwise phase/coherence overlays from `StageSnapshot`
4. expose size-independent visual inputs for the stage graphic

### 3. Stage Graphic Component
Add:
1. `src/components/StageStateView.vue`

Responsibilities:
1. render current local cloud/phase marker language
2. augment it with nonlocal phase visuals when pairwise coherence carries distinctions that local Bloch data does not
3. scale the same visual semantics for both `sm` and `md`

### 4. Shared Stage Consumers
These files should consume `StageSnapshot` and derive visuals locally:
1. `src/components/StageInspector.vue`
2. `src/components/circuit/CircuitStageSnapshots.vue`
3. `src/components/MeasurementPanel.vue`

### 5. Shared Panel Shells
These files should pass through `StageSnapshot` contracts unchanged:
1. `src/components/CircuitPanel.vue`
2. `src/components/circuit/LessonCircuitPanel.vue`
3. `src/components/algorithms/shared/FixedCircuitPanel.vue`
4. `src/components/algorithms/teleportation/TeleportationCircuitPanel.vue`

## Phase/Commit Plan

## Commit 1: Canonical Snapshot Scaffolding

### Goal
Introduce canonical stage snapshots without changing visible behavior.

### Files
1. `src/types.ts`
2. `src/state/selectors.ts`
3. `src/state/index.ts`
4. `src/components/circuit/stage-visual-model.ts`
5. `tests/stage-snapshots.test.cjs`

### Work
1. Add `StageSnapshot` type to `src/types.ts`.
2. Keep `StageView` temporarily as a legacy derived type.
3. In `src/state/selectors.ts`, add:
   - `stageSnapshots`
   - `selectedStageSnapshot`
4. Make legacy `stageViews` derive from `stageSnapshots` rather than directly from `ensembleSnapshots`.
5. Add `src/components/circuit/stage-visual-model.ts` with pure helpers:
   - `distributionForStageSnapshot(snapshot)`
   - `blochPairForStageSnapshot(snapshot)`
   - `deriveLegacyStageView(snapshot)`
   - `deriveStageVisualModel(snapshot)` returning only current local visual data for now
6. Export the new selectors from `src/state/index.ts`.
7. Add tests proving:
   - canonical stage snapshots retain the original ensemble
   - legacy stage views are derived artifacts, not the source of truth

### Deliverable
1. The codebase has a canonical stage type.
2. Existing UI behavior is unchanged.
3. The architecture no longer requires building stage state out of reduced data first.

### Stop Point
Review the new snapshot contract and confirm no consumer still needs canonical stage data to be view-shaped.

## Commit 2: Free-form Leaf Consumer Migration

### Goal
Move Free-form stage rendering to canonical snapshots before changing visuals.

### Files
1. `src/components/StageInspector.vue`
2. `src/components/circuit/CircuitStageSnapshots.vue`
3. `src/components/MeasurementPanel.vue`
4. `src/components/StageStateView.vue`
5. `src/components/CircuitPanel.vue`

### Work
1. Add `src/components/StageStateView.vue`.
2. For this commit, `StageStateView.vue` may render the same current cloud visual by deriving `blochPair` locally from `StageSnapshot`.
3. Change `StageInspector.vue` prop contract from `StageView` to `StageSnapshot`.
4. Change `CircuitStageSnapshots.vue` prop contract from `StageView[]` to `StageSnapshot[]`.
5. Replace direct use of `stage.blochPair` and `stage.distribution` with local derivation through `stage-visual-model.ts`.
6. Change `MeasurementPanel.vue` to read final stage from `StageSnapshot` and derive visual data locally.
7. Change `CircuitPanel.vue` to pass `stageSnapshots` and `selectedStageSnapshot`.

### Deliverable
1. Free-form stage UI consumes canonical snapshots end-to-end.
2. Visible output remains functionally unchanged.
3. No Free-form stage UI relies on pre-reduced stage state.

### Stop Point
Manual UI review that stage cards and inspector still match pre-refactor behavior.

## Commit 3: Shared Panel Contract Migration

### Goal
Migrate shared circuit panel shells so all workspaces can consume canonical snapshots.

### Files
1. `src/components/circuit/LessonCircuitPanel.vue`
2. `src/components/algorithms/shared/FixedCircuitPanel.vue`
3. `src/components/algorithms/teleportation/TeleportationCircuitPanel.vue`

### Work
1. Change props from:
   - `stageViews`
   - `selectedStage`
   to:
   - `stageSnapshots`
   - `selectedStageSnapshot`
2. Pass canonical snapshots through unchanged.
3. Ensure shared stage components continue to derive view data locally.

### Deliverable
1. Shared panel shells are canonical-stage-safe.
2. Later feature-model migrations become mechanical.

### Stop Point
Review prop naming and confirm that stage-shell contracts are no longer view-shaped.

## Commit 4: Feature Model Migration

### Goal
Make every stage-producing model emit `StageSnapshot[]`.

### Files
1. `src/components/abstractions/preparing-qubits/usePreparingQubitsModel.ts`
2. `src/components/abstractions/phase-kickback/usePhaseKickbackModel.ts`
3. `src/components/abstractions/entanglement/useEntanglementModel.ts`
4. `src/components/algorithms/deutsch/useDeutschModel.ts`
5. `src/components/algorithms/teleportation/useTeleportationModel.ts`
6. `src/components/error-codes/shared/useSingleErrorColumnModel.ts`

### Additional likely downstream readers
1. `src/components/error-codes/bit-flip/useBitFlipRepetitionModel.ts`
2. `src/components/error-codes/phase-flip/usePhaseFlipRepetitionModel.ts`
3. `src/components/error-codes/shor/useShorNineQubitModel.ts`
4. any model reading `finalStage.blochPair` or `selectedStage.blochPair`

### Work
1. Replace `StageView[]` creation with `StageSnapshot[]` creation.
2. Keep stage labels/index/final flags unchanged.
3. Where downstream logic currently reads `stage.blochPair`, replace that with local derivation from `stage.ensemble`.
4. Leave stage visual semantics unchanged until Commit 5.

### Deliverable
1. All stage-producing models preserve canonical stage state.
2. All stage consumers derive local reductions at the point of need.

### Stop Point
Review whether any cross-workspace consumer still assumes `distribution` or `blochPair` is stored on the stage object.

## Commit 5: Full-State Visual Derivation

### Goal
Teach the stage graphic to render distinctions carried only by nonlocal phase/coherence.

### Files
1. `src/quantum.ts`
2. `src/quantum/reduced-density.ts` (only if helper changes are needed)
3. `src/components/circuit/stage-visual-model.ts`
4. `src/components/StageStateView.vue`
5. `src/styles/bloch.css`
6. possibly `src/styles/circuit-stage.css` if stage-card-specific tuning is needed
7. `tests/stage-visual-model.test.cjs`

### Work
1. Re-export `reduced_density_for_subset_ensemble` from `src/quantum.ts` if needed for the stage visual helper.
2. In `src/components/circuit/stage-visual-model.ts`, derive pairwise reduced density matrices for visible row pairs.
3. For each pair `(a, b)`, extract phase-sensitive coherence channels:
   - same-parity coherence from `rho[0][3]`
   - opposite-parity coherence from `rho[1][2]`
4. Convert each complex coherence term into:
   - magnitude
   - angle
5. Add overlay derivation types:
   - `QubitPhaseOverlay`
   - `PairPhaseOverlay`
6. Update `StageStateView.vue` so:
   - local Bloch phase drives local cloud markers when available
   - pairwise coherence drives direct visual changes when local Bloch is insufficient
7. Keep the visual language continuous with the current stage graphic:
   - cloud color shifts
   - phase marker angle shifts
   - glow/bridge overlays
   - mirrored sector effects
8. Ensure that the same visual mechanism works in both:
   - `size="sm"` snapshot cards
   - `size="md"` main inspector

### Visual semantics for the exact bug
For `(|00> + |11>)/sqrt(2)` vs `(|00> - |11>)/sqrt(2)`:
1. local single-qubit Bloch inputs are the same
2. same-parity coherence magnitude remains high
3. same-parity coherence angle differs by `pi`
4. stage visuals must map that angle difference into a visible change in marker direction/palette/glow

### Deliverable
1. Entangled phase differences survive into the stage graphic.
2. The exact Free-form repro becomes visually distinguishable with no added text.

### Stop Point
Manual compare-stage review on the exact repro and at least one additional entangled-phase case.

## Commit 6: Cleanup And Removal Of Legacy StageView

### Goal
Remove the old lossy shared stage contract so the architecture cannot regress.

### Files
1. `src/types.ts`
2. `src/components/circuit/stage-visual-model.ts`
3. any remaining callers still referencing `StageView`

### Work
1. Delete `StageView` from `src/types.ts`.
2. Delete any temporary adapter such as `deriveLegacyStageView(...)`.
3. Remove any exports, props, or local variables that still assume stage state is pre-reduced.

### Deliverable
1. Canonical stage data is lossless at the shared stage layer.
2. View reductions exist only at the consumer boundary.

### Stop Point
Search-based review that no shared stage contract collapses full state prematurely.

## File-By-File Refactor Map

### `src/types.ts`
Add:
1. `StageSnapshot`
2. `StageVisualModel`
3. visual overlay support types

Remove later:
1. `StageView`

### `src/state/selectors.ts`
Add:
1. `stageSnapshots`
2. `selectedStageSnapshot`

Change:
1. legacy `stageViews` to derive from snapshots during migration

### `src/state/index.ts`
Export:
1. `stageSnapshots`
2. `selectedStageSnapshot`

### `src/components/circuit/stage-visual-model.ts`
New file.

Responsibilities:
1. pure derivation of distribution
2. pure derivation of Bloch pair
3. pure derivation of pairwise phase overlays
4. legacy adapter only during migration

### `src/components/StageStateView.vue`
New file.

Responsibilities:
1. render stage graphic from canonical stage input
2. unify local and nonlocal phase rendering paths

### `src/components/StageInspector.vue`
Change:
1. accept `StageSnapshot`
2. derive visuals locally
3. use `StageStateView` instead of `BlochPairView` directly

### `src/components/circuit/CircuitStageSnapshots.vue`
Change:
1. accept `StageSnapshot[]`
2. derive stage display data per card
3. use `StageStateView` instead of `BlochPairView` directly

### `src/components/MeasurementPanel.vue`
Change:
1. read final canonical stage snapshot
2. derive final-stage visual locally
3. keep sampled basis visual derivation as a boundary-only reduction

### `src/components/CircuitPanel.vue`
Change:
1. pass `stageSnapshots`
2. pass `selectedStageSnapshot`

### `src/components/circuit/LessonCircuitPanel.vue`
Change:
1. update stage props to snapshots

### `src/components/algorithms/shared/FixedCircuitPanel.vue`
Change:
1. update stage props to snapshots

### `src/components/algorithms/teleportation/TeleportationCircuitPanel.vue`
Change:
1. update stage props to snapshots

### Stage-producing model files
All should:
1. build snapshots from `ensembleSnapshots`
2. stop embedding derived display data in shared stage objects

## Test Plan

## New Tests

### `tests/stage-snapshots.test.cjs`
Verify:
1. stage snapshot arrays preserve the source ensemble
2. stage labels/indexes/final flags remain correct
3. derived legacy stage views are not canonical state

### `tests/stage-visual-model.test.cjs`
Verify:
1. `H(q0); CNOT(q0,q1)` and `H(q0); CNOT(q0,q1); Z(q0)` have identical measurement distributions
2. they also have identical `bloch_pair_from_ensemble(...)`
3. `deriveStageVisualModel(...)` produces distinct pair-phase overlay data
4. the overlay difference survives both `sm` and `md` render thresholds

### Search-based cleanup checks
Use search or static assertions to ensure:
1. no shared stage contract omits canonical stage ensemble
2. no stage component expects stage state to arrive pre-reduced

## Existing Tests Likely Touched
1. `tests/entanglement-visualization.test.cjs`
2. `tests/simulation-regression.test.cjs`
3. any tests that rely on `stageViews` or `selectedStage`

## Migration Risks
1. Shared panel shells are reused across multiple workspaces, so prop migrations can break multiple tabs at once.
2. Some feature models currently depend on `finalStage.blochPair` as a convenience; these must be updated carefully so they derive locally rather than reintroducing lossy shared types.
3. Small-card compare mode may still look unchanged if pair-phase visuals are too subtle; size-specific tuning is required.
4. It is easy to reintroduce loss by caching only derived visual data instead of keeping the snapshot canonical.

## Acceptance Criteria

### Architecture
1. Shared stage state is represented by canonical stage snapshots carrying full `StateEnsemble`.
2. Distribution, Bloch, and phase visuals are derived at the view boundary.
3. No shared stage contract collapses distinct underlying states into identical canonical values.

### Product
For the exact repro:
1. Build `H(q0)`, `CNOT(q0, q1)`.
2. Compare stages.
3. Add `Z(q0)`.
4. Compare stages.

Result required:
1. There is a clear visual difference in the stage cards and Stage Inspector.
2. The difference comes from the stage graphic itself.
3. No extra text or classification is needed to perceive the change.

## Recommended Execution Order
1. Commit 1: canonical scaffolding
2. Commit 2: Free-form leaf migration
3. Commit 3: shared shell migration
4. Commit 4: feature model migration
5. Commit 5: full-state visual derivation
6. Commit 6: cleanup and deletion of legacy `StageView`

This order keeps the structural correction separate from the visual fix, which makes both the refactor and the regression tests easier to reason about.
