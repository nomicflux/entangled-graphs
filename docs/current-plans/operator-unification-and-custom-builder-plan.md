# Operator Unification + Custom Builder Plan

## Goal
Refactor the gate/operator model into one unified system so built-in and custom gates share the same structure, then add a new custom multi-qubit operator builder UI.

## Naming Decision
Use `qubitArity` instead of `"dimension"`.

- Meaning: number of qubits an operator acts on.
- Examples:
  - `2x2` matrix => `qubitArity: 1`
  - `4x4` matrix => `qubitArity: 2`
  - `8x8` matrix => `qubitArity: 3`

## Constraints
1. No defensive coding in internal APIs.
2. Illegal states must be unrepresentable internally.
3. Validation may exist only at user-input boundaries (UI/form parsing).
4. Stop at the end of each phase for manual review.

## Phase 1: Core Operator Model + Typed Constructors
### Work
1. Replace scalar field matrix format (`o00`, `o01`, `o10`, `o11`) with `Complex[][]`.
2. Introduce unified operator type:
   - `Operator<Arity>` (or equivalent branded runtime-safe type)
   - fields: `id`, `label`, `qubitArity`, `matrix`.
3. Add constructor pipeline that guarantees internal matrix size consistency:
   - primitive constructor for `1-qubit` matrix from exact `2x2` input.
   - primitive constructor for `n-qubit` matrix from guaranteed-square matrix.
   - no internal fallback paths once constructed.
4. Migrate built-in single-qubit gates (`I`, `X`, `H`, `S`) to the new model.
5. Update math utilities to consume new matrix representation.

### Deliverable
1. Unified operator type and constructors are in place.
2. Built-in 1-qubit operators compile and run through the new type.
3. `npx tsc --noEmit` and `npm run build` pass.

### Stop Point
Manual review before simulation/gate-placement migration.

## Phase 2: Unify Gate Instances and Simulation on Operator Arity
### Work
1. Replace gate-specific runtime kinds (`single`, `cnot`, `toffoli`) with unified placed-operator instances:
   - operator reference
   - wire mapping (ordered wires of length = `qubitArity`)
2. Update simulation engine to apply arbitrary `k`-qubit operator (`k = qubitArity`) onto selected wires for an `N`-qubit state.
3. Convert CNOT and Toffoli to ordinary operators in registry (no special-case simulation branches).
4. Use `qubitArity` to determine gate visibility in palette (`qubitCount >= qubitArity`).
5. Keep placement flows (CNOT/Toffoli staged UX) but backed by unified operator placement objects.

### Deliverable
1. One simulation path handles all operators by arity.
2. CNOT/Toffoli are data-defined operators, not simulation special-cases.
3. Palette visibility is driven by `qubitArity`.
4. Build + typecheck pass.

### Stop Point
Manual review of behavior parity vs current CNOT/Toffoli interactions.

## Phase 3: Block-Matrix Composition API
### Work
1. Add operator composition helpers:
   - matrix multiply / tensor product over new operator type.
   - block-matrix constructor:
     - `block2x2([[A, B], [C, D]]) -> Operator<Arity + 1>`
     - all blocks must share `qubitArity`.
2. Build utility zero/identity operators by arity for composition.
3. Reconstruct CNOT and Toffoli using composition API:
   - `CNOT = controlled(X)` via block matrix.
   - `Toffoli = controlled(CNOT)` via block matrix.
4. Keep registry output identical labels/IDs for UI continuity.

### Deliverable
1. CNOT and Toffoli are created through composition, not handwritten truth-table code paths.
2. Block-matrix constructor is available for future custom builders.
3. Build + typecheck pass.

### Stop Point
Manual review of generated operator correctness and readability.

## Phase 4: Test Harness + Coverage for New Architecture
### Work
1. Add test framework (`vitest`) and scripts:
   - `test`, `test:watch` (and optional `test:run`).
2. Add unit tests for:
   - operator constructors and arity/matrix-size invariants.
   - block-matrix composition correctness.
   - generic `k`-qubit operator application.
   - CNOT and Toffoli behavior vs truth tables.
   - arity-based palette gate eligibility.
3. Add regression tests for state snapshots/measurement distribution equivalence before/after refactor on canonical circuits.

### Deliverable
1. Deterministic automated tests for core model + simulation.
2. Test suite green in CI-local command.
3. Build + typecheck pass.

### Stop Point
Manual review of test quality and missing cases before UI builder work.

## Phase 5: Custom Gate UX Split + Multi-Qubit Block Builder
### Work
1. Rename existing custom flow to explicit single-qubit naming:
   - e.g. `Custom (1Q)` / `Custom Single-Qubit Gate`.
2. Add new custom modal flow:
   - choose `qubitArity` first.
   - then build operator using block matrix with accessible lower-arity gates.
3. Start scope for builder:
   - `qubitArity = 2` first-class support (4 blocks from 1Q gates).
   - architecture supports extension to higher arities.
4. On submit:
   - construct operator through composition constructors only.
   - persist into custom operator store.
   - make available in palette with `qubitArity` visibility rules.
5. Add tests for modal model/state transform (UI boundary parsing and resulting operator construction).

### Deliverable
1. Two explicit custom paths exist: single-qubit and multi-qubit builder.
2. Multi-qubit custom operators can be created and placed through unified operator model.
3. Tests + build + typecheck pass.

### Stop Point
Manual review and UX sign-off.

## Prompt Coverage Checklist
1. Unified operator structure with matrix array + non-ambiguous qubit count field:
   - Covered by Phase 1 (`qubitArity`, `Complex[][]`, constructors).
2. Apply same operator model to CNOT/Toffoli and use arity for gate availability:
   - Covered by Phase 2.
3. Build operators from operators via block-matrix constructor and use it for CNOT/Toffoli:
   - Covered by Phase 3.
4. Add tests confirming correctness:
   - Covered by Phase 4 (and additional Phase 5 UI-model tests).
5. Rename custom single-qubit flow + add new arity-selecting block-matrix custom modal:
   - Covered by Phase 5.

## Global Validation Criteria
1. No internal defensive checks for states that constructors/types can forbid.
2. Illegal placements/operators cannot be represented post-construction.
3. Existing user-visible circuit behavior remains correct after migration.
4. `npx tsc --noEmit` passes.
5. `npm run build` passes.
6. New test suite passes.
