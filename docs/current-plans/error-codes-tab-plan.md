# Error Codes Tab Plan

## Goal
Add a new top-level `Error Codes` workspace alongside `Free-Form`, `Algorithms`, and `Abstractions`, with the same three-part teaching shape already used in the app:
1. `Input`
2. `Circuit`
3. `Output`

Initial `Error Codes` entries:
1. `3-Qubit Replication (Bit Errors)`
2. `3-Qubit Replication (Phase Errors)`
3. `Shor 9-Qubit Code`

Each module must let the learner introduce errors in the editable in-circuit `Inject errors` column and see whether the code catches/corrects them. For the bit-error module, stray phase errors must be shown as not protected by that code.

## Implementation Status
Current state in the repo:
1. Completed:
   - top-level `Error Codes` tab and persistence wiring
   - shared `LessonCircuitPanel` extraction and abstraction-panel migration
   - bounded large-register stage output for 9-qubit readability
   - `ErrorCodesWorkbench` plus the three initial module scaffolds
   - logical preset input, editable in-circuit error stage with multiple simultaneous injected errors, and code-specific output panels
   - in-circuit error injection with no separate side-panel explainer
   - detailed Shor syndrome readout and model-level correctness tests
2. Completed architectural cleanup:
   - the circuit-grid layer is now split into:
     - a lifecycle-free interaction core for lesson models and direct model tests
     - a component-scoped lifecycle binding for UI-only behavior such as the `Escape` key listener
   - lesson model composables no longer pull `onMounted`/`onUnmounted` into direct model tests
   - the error-code tests now run the models inside a Vue effect scope instead of filtering framework warnings
3. Verification:
   - `npm test` passed
   - `npm run -s build` passed
4. Product-shape note:
   - error introduction remains in the editable in-circuit `Inject error` column, per the locked product decision
   - that in-circuit stage supports multiple simultaneous physical errors across different wires
   - the editable circuit column is the only error-injection surface

## Hard Constraints
1. Add a new top-level tab named `Error Codes`.
2. Keep `Free-Form`, `Algorithms`, `Abstractions`, and `p-adic` behavior unchanged.
3. Use the same base components/composables already powering the current tabs wherever they already solve the problem.
4. Do not duplicate existing circuit-grid, palette, stage-snapshot, or stage-inspector functionality.
5. New components are allowed only for genuinely new work:
   - error-injection controls
   - code-specific output panels
   - large-register summaries needed for 9-qubit readability
6. Each initial module must present:
   - input
   - circuit
   - output
   - locked key gates
   - visible error-injection behavior through the editable in-circuit error column and the output readout

## Locked Product Decisions
1. `Error Codes` is a top-level workspace with three initial subtabs:
   - `3-Qubit Replication (Bit Errors)`
   - `3-Qubit Replication (Phase Errors)`
   - `Shor 9-Qubit Code`
2. The section reuses the existing circuit/stage UI foundation, but entanglement overlays and entanglement-analysis views are not required here.
3. If dropping entanglement views materially simplifies the implementation, `Error Codes` should omit them rather than forcing parity with `Algorithms` or `Abstractions`.
4. The shared lesson-circuit component should support entanglement visuals as an optional capability, not a mandatory one.
5. Logical input uses presets rather than free-form Bloch sliders.
6. Error injection is represented as an editable in-circuit stage.
7. `Shor 9-Qubit Code` should include detailed syndrome readout rather than only a summarized recovery panel.

## Reuse Inventory

### Existing app shell and persistence
Accessible now:
1. `src/App.vue`
2. `src/app/persistence.ts`
3. `tests/app-persistence.test.cjs`
4. `src/styles/app-tabs.css`

Use for:
1. Adding `error-codes` to workspace mode parsing/persistence.
2. Adding `ErrorCodesWorkbench` beside the current top-level workspaces.
3. Adding a persisted selected error-code module, following the algorithm/abstraction pattern.

### Existing lesson/workspace shell patterns
Accessible now:
1. `src/components/algorithms/AlgorithmsWorkbench.vue`
2. `src/components/abstractions/AbstractionsWorkbench.vue`
3. `src/components/algorithms/TeleportationScaffold.vue`
4. `src/components/algorithms/DeutschScaffold.vue`
5. `src/components/abstractions/PreparingQubitsScaffold.vue`
6. `src/components/abstractions/EntanglementScaffold.vue`
7. `src/components/abstractions/PhaseKickbackScaffold.vue`

Use for:
1. Error-code subtab navigation.
2. Three-panel lesson layout.
3. Separating module-specific source/error/output controls from the shared circuit center panel.

### Existing circuit primitives
Accessible now:
1. `src/components/circuit/CircuitGatePalette.vue`
2. `src/components/circuit/CircuitStageSnapshots.vue`
3. `src/components/StageInspector.vue`
4. `src/components/BlochPairView.vue`
5. `src/components/algorithms/shared/FixedCircuitPanel.vue`

Use for:
1. Rendering the circuit grid and stage progression.
2. Reusing current stage-selection behavior.
3. Reusing Bloch/readout visual language.
4. Reusing fixed-circuit rendering where a module is fully locked.

Do not copy:
1. The repeated center-panel markup currently present in the abstraction scaffolds.

Plan:
1. Extract a shared lesson-circuit center component before adding error-code modules, or
2. Refactor the current abstraction center panel into a reusable constrained-circuit component and use that in both abstractions and error codes.

### Existing circuit interaction and lock infrastructure
Accessible now:
1. `src/components/circuit/useCircuitGridInteractions.ts`
2. `src/components/circuit/model-context.ts`
3. `src/components/circuit/lock-policy.ts`
4. `src/components/circuit/useCircuitGridComputed.ts`
5. `src/components/circuit/useCircuitGridPlacementHandlers.ts`
6. `src/components/circuit/useCircuitGridDragHandlers.ts`
7. `src/components/circuit/useCircuitGridTokenHelpers.ts`
8. `src/components/circuit/useCircuitGridConnectors.ts`

Use for:
1. Locked-key-gate behavior.
2. Optional editable error-injection columns without inventing a second circuit editor.
3. Reusing current drop/drag/placement semantics if any error slot is grid-editable.
4. Reusing row/column/grid logic even when entanglement visuals are disabled for this workspace.

### Existing simulation and operator primitives
Accessible now:
1. `src/quantum.ts`
2. `src/state/operators.ts`
3. `src/state/action-helpers.ts`
4. `src/state/gate-instance-utils.ts`
5. `src/state/measurement-locks.ts`

Use for:
1. Building fixed encode/decode/correction backbones as normal circuit columns.
2. Simulating ensembles and stage snapshots for each module.
3. Reusing the existing built-in gates (`X`, `Z`, `H`, `CNOT`, `TOFFOLI`, `M`) needed for the requested codes.

### Important current constraints discovered in code
1. `Free-Form` itself caps at 8 qubits via `src/state/constants.ts`, but lesson-local models in abstractions already bypass that global cap by providing their own `qubitCount`. That means a 9-qubit error-code lesson is still feasible without changing Free-Form behavior.
2. `BlochPairView` supports arbitrary row counts, so it is reusable for 3 and 9 qubits.
3. `StageInspector` and `CircuitStageSnapshots` currently render the full basis distribution. That is acceptable for 3 qubits, but not for 9 qubits where a full distribution is 512 basis rows.

Implication:
1. For `Shor 9-Qubit Code`, extend the existing stage-output components with summarization options instead of copying them.
2. The correct direction is to add optional large-register modes such as:
   - top-N basis rows
   - logical-state summary
   - syndrome summary
   - collapsed/filtered distribution views
3. Error-code modules do not need entanglement overlays; removing them from this workspace reduces both conceptual noise and 9-qubit compute pressure.

## Proposed Architecture

### A. Navigation and persistence
1. Extend `WorkspaceMode` with `error-codes`.
2. Add `ErrorCodeView` union for the three initial modules.
3. Add `ERROR_CODE_STORAGE_KEY` plus parser/read/write helpers.
4. Update `App.vue` to show a top-level `Error Codes` button and mount `ErrorCodesWorkbench`.
5. Add persistence tests matching the existing algorithm/abstraction coverage.

### B. Shared error-code workspace shell
1. Add `src/components/error-codes/ErrorCodesWorkbench.vue`.
2. Mirror the existing workbench pattern:
   - subtab buttons
   - selected module prop
   - emit selection change
3. Add a dedicated style file only for workspace-specific framing if needed:
   - `src/styles/error-codes.css`
4. Keep shared circuit/panel styles coming from the current style system.

### C. Shared constrained lesson-circuit center panel
Requirement:
1. Do not paste another copy of the abstraction center-panel circuit markup.

Plan:
1. Extract a reusable component such as `LessonCircuitPanel.vue` or `ConstrainedCircuitPanel.vue`.
2. That shared component should own:
   - palette area
   - column controls
   - grid rendering
   - locked-cell visuals
   - connector rendering
   - optional entanglement overlay hooks
   - stage snapshots
   - stage inspector
3. It must accept injected model data/functions rather than own lesson state.
4. Existing abstractions should be able to migrate onto it with minimal behavior change.
5. Error-code modules then use the same center component rather than inventing a fourth circuit layout implementation.
6. The component must support an `entanglement disabled` mode so `Error Codes` can reuse the circuit shell without paying for views this section does not need.

### D. Shared source/error/output patterns
1. Add a shared source-state input model patterned after teleportation’s source panel:
   - preset-only logical input for the source qubit
   - presets should include at least `|0>`, `|1>`, `|+>`, `|->`
2. Add shared large-register output helpers for genuinely new 9-qubit work:
   - summarized distribution rows
   - syndrome display
   - logical-state fidelity display
3. Reuse `StageInspector`/`CircuitStageSnapshots` by extending them; do not fork them.

## Representation Decisions By Module

### 1. 3-Qubit Replication for Catching Bit Errors
Core teaching goal:
1. Show that tripling a logical qubit and applying majority-style recovery protects against a single `X` error on one physical wire.
2. Show that a `Z` phase error is not protected by this code.

Representation:
1. Qubit count: `3`
2. Input:
   - logical source state on `q0`
   - preset-only input: `|0>`, `|1>`, `|+>`, `|->`
3. Circuit:
   - locked encode columns that replicate the logical value across 3 physical qubits
   - one dedicated editable error-injection stage after encoding
   - locked recovery/decode columns
4. Output:
   - recovered logical state summary
   - comparison against original source state
   - detected/corrected status
   - syndrome/parity explanation in plain language

Why the input must support phase-sensitive presets:
1. If the module only allows `|0>` and `|1>`, a stray `Z` phase error looks invisible.
2. Including `|+>` or arbitrary Bloch input makes the “bit-flip code does not protect phase” lesson observable instead of merely stated.

Preferred circuit representation:
1. Use normal circuit columns with locked backbone gates built from existing gates.
2. Prefer a single designated error column over a fully free-editable tail.
3. The error column is in-grid and editable; all encode/recovery gates stay locked.
4. The editable error column should restrict available gates to the module-relevant error set rather than expose the full lesson palette.

Planned output metrics:
1. Original logical amplitudes/preset label
2. Final recovered logical amplitudes/preset match
3. Recovery fidelity
4. Physical parity or syndrome summary
5. Explicit message for the selected error:
   - no error: logical state preserved
   - single `X`: corrected
   - single `Z`: not protected

Tests:
1. No-error run preserves the logical state.
2. A single `X` on any one of the 3 physical qubits is corrected.
3. A single `Z` on an encoded phase-sensitive state is not corrected.
4. Locked core gates cannot be altered.

### 2. 3-Qubit Replication for Catching Phase Errors
Core teaching goal:
1. Show that the phase-flip repetition code is the bit-flip repetition code viewed in the Hadamard-rotated basis.
2. Show that a single `Z` phase error can be corrected once the code is framed in the `|+> / |->` basis.

Representation:
1. Qubit count: `3`
2. Input:
   - same logical source-state UI as the bit-error module
3. Circuit:
   - locked basis-change steps using `H`
   - locked repetition-code backbone
   - one dedicated editable error-injection stage
   - locked recovery/decode steps
4. Output:
   - recovered logical state summary
   - before/after basis interpretation
   - detected/corrected status for phase errors

Reuse strategy:
1. Build this module on top of the bit-error module model where possible.
2. Reuse the same error-injection controls and most of the same output framing.
3. Reuse the same circuit panel; only the locked backbone and readout interpretation change.

Planned output metrics:
1. Logical input vs logical output fidelity
2. Selected physical error and target wire
3. Basis explanation:
   - “Hadamards turn phase flips into bit flips for the protected section”
4. Recovery status for:
   - no error
   - single `Z` on one wire

Tests:
1. No-error run preserves the logical state.
2. A single `Z` on any one of the 3 physical qubits is corrected.
3. Locked Hadamard/backbone columns remain immutable.

### 3. Shor’s 9-Qubit Correction Code
Core teaching goal:
1. Show that Shor’s code composes phase-flip protection across three blocks with bit-flip protection inside each block.
2. Show correction of an arbitrary single-qubit Pauli error (`X`, `Z`, and therefore `Y`) on any one of the 9 physical qubits.

Representation:
1. Qubit count: `9`
2. Input:
   - same logical source-state UI as the 3-qubit modules
3. Circuit:
   - locked encoding backbone that visibly groups the 9 wires into three 3-qubit blocks
   - one dedicated editable error-injection stage
   - locked recovery/decode backbone
4. Output:
   - logical recovery result
   - detailed identified block/wire syndrome readout
   - protection summary for selected error

Important UI constraint:
1. Do not show the full 512-row basis distribution by default.
2. Keep the same base stage components, but extend them for large-register summarization.

Planned output/readout design:
1. Logical-state fidelity against the source qubit
2. Error summary:
   - injected error type
   - injected wire
   - whether the code corrected it
3. Detailed syndrome readout:
   - which 3-qubit block registered the problem
   - which within-block position was implicated for bit-style recovery
   - phase-syndrome vs bit-syndrome interpretation
   - readout per relevant parity/syndrome check, not just the final diagnosis
4. Optional top-N basis rows rather than full distribution
5. Stage summaries focused on:
   - encoded logical block structure
   - syndrome/correction progress
   - recovered logical output

Reuse strategy:
1. Compose the existing 3-qubit lesson ideas rather than writing Shor as an unrelated bespoke path.
2. Reuse:
   - same source-state controls
   - same error-injection controls
   - same shared lesson-circuit panel
   - same stage-selection model
3. Add only genuinely new pieces:
   - large-register stage summarization
   - syndrome summary UI specific to 9-qubit correction

Tests:
1. No-error run preserves the logical state.
2. Any single `X` on any one of the 9 physical qubits is corrected.
3. Any single `Z` on any one of the 9 physical qubits is corrected.
4. At least one representative `Y` error is corrected, proving combined bit+phase protection.
5. Large-register output stays bounded and readable.

## Phase Plan

## Phase 1: Shell and persistence
Status:
1. Completed

### Work
1. Add `error-codes` to workspace parsing/storage.
2. Add selected error-code module parsing/storage.
3. Add `ErrorCodesWorkbench` with three subtabs.
4. Wire `App.vue` tab navigation.
5. Add persistence tests.

### Deliverable
1. User can switch into `Error Codes`.
2. Subtab selection persists.
3. Existing workspaces remain unchanged.

## Phase 2: Shared circuit-panel extraction
Status:
1. Completed

### Work
1. Extract the repeated abstraction center-panel circuit UI into a reusable shared component.
2. Keep the extracted component powered by existing circuit primitives:
   - `CircuitGatePalette`
   - `useCircuitGridInteractions`
   - `CircuitStageSnapshots`
   - `StageInspector`
3. Add support for:
   - locked key columns
   - optional editable error column
   - optional large-register summary props
   - optional entanglement overlays
4. Migrate at least one existing abstraction onto the shared component to prove the extraction is real, not theoretical.

### Deliverable
1. No new circuit UI duplication is introduced for error codes.
2. Error-code modules can be built on the same center-panel infrastructure already used elsewhere.

## Phase 3: Shared source/error/output primitives
Status:
1. Completed

### Work
1. Extract or build a shared logical-source input component.
2. Build `ErrorInjectionControls`.
3. Extend stage output components for large-register summaries.
4. Add shared fidelity/status helpers for comparing logical input to recovered output.
5. Ensure the shared error controls drive an editable in-circuit error column, not a detached side-effect.

### Deliverable
1. The three modules share the same source/error/output primitives where the pedagogy is the same.
2. The 9-qubit lesson remains readable without forking stage-inspection components.

## Phase 4: 3-qubit bit-error module
Status:
1. Implemented, pending post-refactor validation pass.

### Work
1. Implement the locked encode/error/recover/decode path.
2. Add source-state presets including phase-sensitive inputs.
3. Add explicit not-protected handling for stray phase errors.
4. Add output metrics and tests.

### Deliverable
1. Single-bit errors are visibly corrected.
2. Stray phase errors are visibly not protected.

## Phase 5: 3-qubit phase-error module
Status:
1. Implemented, pending post-refactor validation pass.

### Work
1. Reuse the bit-error foundation and add the Hadamard-basis transformation.
2. Keep the same source/error/output structure.
3. Add phase-specific recovery messaging and tests.

### Deliverable
1. Single-phase errors are visibly corrected.
2. The relation to the bit-flip code is clear in the UI and implementation.

## Phase 6: Shor 9-qubit module
Status:
1. Implemented, pending post-refactor validation pass.

### Work
1. Build the 9-wire locked backbone compositionally from the repetition-code ideas.
2. Reuse the same source/error/output controls.
3. Add detailed syndrome readout and bounded large-register output.
4. Add targeted correctness and readability tests.

### Deliverable
1. A learner can inject one physical Pauli error and see Shor’s code recover the logical state.
2. The UI stays readable and performs acceptably despite the 9-qubit register.

## Acceptance Criteria
1. `Error Codes` appears as a top-level workspace and persists.
2. The three initial modules exist as subtabs.
3. Each module has input, circuit, output, and error-injection sections.
4. Key circuit gates are locked.
5. Existing base components/composables are reused rather than copied.
6. The bit-error module visibly fails to protect against stray phase errors.
7. The phase-error module visibly protects against single phase errors.
8. Shor’s module visibly protects against single-qubit bit and phase errors.
9. Existing tabs continue to behave as before.

## Risks To Resolve During Implementation
1. The current stage-output components need summarization support for 9-qubit readability.
2. Full entanglement-model overlays may become expensive for 9-qubit stages; the current plan explicitly allows omitting them in `Error Codes`.
3. The current abstraction center-panel duplication should be reduced before adding a fourth near-copy.
4. Lesson models must stay testable without component lifecycle hooks; the grid interaction layer now needs an explicit model/view boundary.
