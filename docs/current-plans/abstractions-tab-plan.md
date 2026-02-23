# Abstractions Tab Plan

## Goal
Add a new top-level `Abstractions` workspace that teaches reusable quantum ideas with:
1. Fixed conceptual constraints (state, circuit, or both), represented in the most pedagogically clear way.
2. Interactive exploration on top of that core.
3. Reuse of existing Free-Form and Algorithms UI/logic primitives (gate palette, circuit grid, stage snapshots, stage inspector, entanglement overlays, measurement behavior).

Initial entries:
1. `Preparing Qubits`
2. `Entanglement`
3. `Phase Kickback`

## Scope Constraints
1. Keep current `Free-Form`, `p-adic`, and `Algorithms` behavior unchanged.
2. Abstractions must remain interactive, but each lesson must encode only the minimum fixed constraints needed to teach that lesson.
3. Favor shared composables/components over one-off duplicated logic.
4. Pedagogy-first representation: if two implementations are mathematically equivalent, prefer the one that is clearest for the learner.
5. Do not force locked gate columns into lessons whose fixed requirement is a prepared state rather than a circuit backbone.

## Locked Product Decisions
1. Top-level tabs become: `Free-Form`, `p-adic (experimental)`, `Algorithms`, `Abstractions`.
2. `Abstractions` has sub-tabs: `Preparing Qubits`, `Entanglement`, `Phase Kickback`.
3. Locking is per-abstraction, not universal:
   - some abstractions use locked circuit columns,
   - some abstractions use fixed prepared state with no locked circuit columns.
4. When locked circuit columns are used, locked core means:
   - no drag, no overwrite, no Alt-clear
   - visible lock hint/tooltips on blocked actions
5. Existing measurement lock semantics remain active when `M` is enabled (`M` still locks later columns on measured wire).
6. Abstraction tab + selected abstraction persist in localStorage.

## Representation Contract (Must Hold)
Before coding each abstraction, explicitly classify the fixed part:
1. `Fixed state only`:
   - use prepared-state constraints,
   - no synthetic locked placeholder gates.
2. `Fixed circuit only`:
   - lock specific circuit columns/gates.
3. `Fixed state + fixed circuit`:
   - use both, but each must be visible and justified in lesson text.

If implementation and lesson intent diverge, lesson intent wins.

## Entry Definitions

### 1) Preparing Qubits
Core constraint:
1. Qubits start in `|0>` at the prepared stage and this baseline is not editable in-place.
2. Core lesson goals are fixed and shown as target states (`|0>`, `|1>`, `|+>`, `|->`) for each active qubit row.
3. No locked baseline circuit gates are shown.

Exploration goals:
1. Show how `X` maps `|0> <-> |1>`.
2. Show how `H` maps computational basis into superposition basis (`|0> -> |+>`, `|1> -> |->`).
3. Let users compose `X` and `H` in editable columns to prepare requested targets from `|0>`.

Planned emphasis:
1. Restrict palette to the prep-focused gate set (`X`, `H`).
2. Immediate per-row "target reached" checks using stage distribution/Bloch view.
3. Guided examples that step from `|0>` to `|1>`, then to `|+>`/`|->`.

Non-goals:
1. No locked `I`-gate scaffold.
2. No algorithm-style fixed backbone visuals in this lesson.

### 2) Entanglement
Core backbone (locked circuit):
1. `H` on `q0`
2. `CNOT q0 -> q1`

Exploration goals:
1. Show Bell-pair creation from `|00>` baseline.
2. Let user add gates in later columns and observe correlation/entanglement changes.
3. Let user insert early `M` on one wire and observe collapse + lock behavior.

Planned emphasis:
1. Correlation framing (`P(q1|q0)` and mismatch probability).
2. Stage-by-stage entanglement overlays already present in the circuit view.
3. Clear callout when entanglement is removed by measurement or local operations.

### 3) Phase Kickback
Core backbone (locked circuit, simplified Deutsch-style kickback):
1. `H` on `q0`
2. `X` on `q1`
3. `H` on `q1` (prepares `|->` target)
4. `CNOT q0 -> q1` (kickback step)
5. `H` on `q0` (phase-to-bit readout)

Exploration goals:
1. Show that target phase preparation causes phase on control after controlled operation.
2. Show final `q0` readout change due to kickback.
3. Let user add post-core gates/measurements to inspect how kickback can be preserved or destroyed.

Planned emphasis:
1. Relative-phase indicator for control path before/after the kickback column.
2. Readout interpretation panel ("phase encoded on control, then converted by final H").

## Technical Architecture

### A. Navigation + Persistence
1. Extend workspace mode union to include `abstractions`.
2. Add `ABSTRACTION_STORAGE_KEY` and parser/writer for selected abstraction view.
3. Wire `App.vue` tab button and mount `AbstractionsWorkbench`.

### B. Shared "Constrained Interactive Circuit" Layer
1. Introduce a shared circuit model shape for abstraction entries:
   - `preparedQubits`/prepared state
   - `coreColumns`
   - `exploreColumns`
   - `combinedColumns`
   - `selectedGate`/selected stage index
2. Add lock policy utilities (optional per abstraction):
   - `isLockedCell(column,row)`
   - `lockReason(column,row)`
3. Reuse current free-form grid/palette/stage components by adapting interaction composables to accept:
   - injected columns/actions (not only global free-form singleton)
   - optional lock policy hook
4. Keep existing free-form path using the same composables with default unlocked policy.
5. Ensure unlocked abstractions render identically to standard editable circuit columns (no lock styling artifacts).

### C. Abstraction Scaffolds
1. `AbstractionsWorkbench.vue` for sub-tab shell.
2. `PreparingQubitsScaffold.vue` + `usePreparingQubitsModel.ts`.
3. `EntanglementScaffold.vue` + `useEntanglementAbstractionModel.ts`.
4. `PhaseKickbackScaffold.vue` + `usePhaseKickbackModel.ts`.
5. Shared center panel for constrained interactive circuit (reusing circuit palette/grid/snapshots/stage inspector).
6. Shared right-side analysis panel pattern for concept-specific metrics.

## Phase Plan

## Phase 1: Tab Shell + Persistence Wiring
### Work
1. Add `abstractions` to workspace parser/types/storage tests.
2. Add abstraction sub-view persistence key/parser.
3. Add `AbstractionsWorkbench` with three subtabs and placeholder scaffolds.
4. Update app tab nav and routing.

### Deliverable
1. User can switch to `Abstractions`.
2. Subtab selection persists.
3. Existing tabs still behave as before.

### Stop Point
Manual review of navigation and persistence.

## Phase 2: Constrained Interactive Circuit Foundation
### Work
1. Build or refactor shared circuit interactions so they can run against abstraction-local circuit state.
2. Add lock policy support for immutable core cells and explicit no-lock mode.
3. Keep measurement-lock behavior intact on editable columns.
4. Add tests for lock enforcement (cannot place/move/delete locked gates).
5. Add tests for no-lock mode (no locked-cell behavior when abstraction does not define locked cells).

### Deliverable
1. Reusable interactive panel supports locked backbone + editable tail.
2. Free-form still passes existing behavior tests.

### Stop Point
Manual review of interaction feel and lock UX.

## Phase 3: Preparing Qubits Entry
### Work
1. Implement prep model where qubits start from `|0>` baseline and users build preparations with `X/H`.
2. Keep baseline fixed at prepared-state level only (no locked placeholder circuit gates).
3. Add target-state exercises (`|1>`, `|+>`, `|->`) with per-row completion checks.
4. Add deterministic tests for:
   - `X` flipping basis state probabilities
   - `H` generating 50/50 superposition from `|0>`
   - `X` then `H` yielding `|->` behavior
5. Add UI contract check:
   - lesson has zero locked core columns and zero lock warnings by default.

### Deliverable
1. Preparing-qubits tab demonstrates how to move from default `|0>` to required single-qubit targets.
2. Interaction is constrained to the lesson while remaining hands-on.

### Stop Point
Manual pedagogy review for beginner clarity.

## Phase 4: Entanglement Entry
### Work
1. Implement entanglement model with fixed two-column Bell backbone.
2. Add default editable columns after core.
3. Add concept panel:
   - Bell-state intent
   - correlation metrics
   - "what changed entanglement" hints
4. Ensure early measurement flow is explicit (guided hint + visible lock consequences).
5. Add deterministic tests for:
   - baseline entangled output
   - post-core gate perturbations
   - early measurement collapse removing entanglement

### Deliverable
1. Entanglement tab clearly demonstrates creation, propagation, and collapse effects.
2. Core stays immutable while exploration remains interactive.

### Stop Point
Manual pedagogy review for clarity.

## Phase 5: Phase Kickback Entry
### Work
1. Implement kickback model with locked simplified backbone (`H`, `X`, `H`, `CNOT`, `H`).
2. Add phase-tracking/readout metrics:
   - control relative phase around kickback step
   - final control-wire decision meaning
3. Allow post-core exploration with additional gates and optional measurement.
4. Add deterministic tests for:
   - kickback phase transfer signature
   - final `q0` readout expectation in baseline circuit
   - robustness when exploration gates alter phase/readout

### Deliverable
1. Phase kickback is visually and numerically explicit.
2. User can interact beyond the core without editing the core itself.

### Stop Point
Manual review of explanation quality and correctness.

## Phase 6: Hardening + Docs
### Work
1. Add integration tests for abstraction workspace persistence and subtab routing.
2. Add regression tests for lock policy edge cases and state-vs-circuit representation mistakes.
3. Update README section for new Abstractions workspace and learning goals.

### Deliverable
1. Stable Abstractions workspace with coverage for routing, correctness, and lock invariants.
2. Documentation aligned with current UX.

## Guardrails (Added After Phase 3 Review)
1. Never introduce locked placeholder gates to represent an initial state.
2. For each abstraction PR, include a one-line declaration:
   - `Fixed by state`, `Fixed by circuit`, or `Fixed by both`.
3. If the declaration is `Fixed by state`, lock policy must be empty.
4. If lock policy is non-empty, lesson text must explain what is locked and why.
5. Add at least one negative test that fails the previously observed wrong abstraction.

## Suggested Follow-On Abstraction Modules
1. Bell family explorer (`Phi+`, `Phi-`, `Psi+`, `Psi-`) via phase/bit flips on the Bell core.
2. GHZ growth (`H(q0)` + chained CNOTs) to show pairwise vs multipartite signatures.
3. Entanglement swapping (two Bell pairs + Bell measurement) as an advanced bridge topic.
4. Controlled-phase variants (once a native `CZ/CP` gate is introduced) to generalize kickback beyond binary phase.
