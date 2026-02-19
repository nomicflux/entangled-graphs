# Partial Measurements Plan

## Goal
Add in-circuit partial measurements via a measurement gate that can be placed in the circuit timeline, with mathematically correct collapse behavior and row lock constraints after measurement.

## Confirmed Product Decisions
1. Placing measurement on row `q_i` auto-deletes all later gates touching `q_i`.
2. Right-panel output distribution shows expected distribution over all branches (not just last sampled run).
3. Additional measurements on a row after its first measurement are disallowed.
4. Stage inspector shows post-measurement state at measurement stages.

## Math Strategy
Use projection operators on pure-state branches:
1. Keep an ensemble of weighted pure states.
2. For measurement on row `k`, apply `P0` and `P1` to each branch.
3. Split branches by Born-rule probabilities and renormalize each surviving projected state.
4. Continue unitary evolution on each branch.

This is equivalent to density-matrix measurement behavior while preserving the current vector-based codepath architecture.

## Phase 1: Measurement Gate + Placement/Lock Rules
### Work
1. Add builtin single-qubit measurement gate `M`.
2. Add gate metadata for semantic kind:
   - `unitary`
   - `measurement`
3. Track first measurement column per row and enforce:
   - no gate placements after that column on that row,
   - no second measurement on that row after the first.
4. On `M` placement, auto-delete all later gates touching that row.
5. Add circuit UI lock affordances:
   - measured token style,
   - locked slot style,
   - clear placement errors for attempts to place beyond lock.
6. Add phase tests for gate metadata and lock behavior.

### Deliverable
1. `M` appears in the palette and is placeable.
2. Placing `M` locks later cells on the measured row.
3. Later-row gates are auto-deleted on placement of `M`.
4. Second `M` on that row (after first) is disallowed.
5. Typecheck/tests/build pass.

### Stop Point
Manual review before simulator changes.

## Phase 2: Branch-Ensemble Simulator with Projection
### Work
1. Extend simulator internals from single vector to weighted branch ensemble.
2. Keep current unitary gate application behavior per branch.
3. Implement measurement gate application with projectors (`P0`, `P1`) on target wire.
4. Emit stage snapshots as ensemble states after each column.

### Deliverable
1. Partial measurement collapses branches correctly.
2. Entanglement correlations propagate after measurement.
3. Typecheck/tests/build pass.

### Stop Point
Manual review of state evolution math.

## Phase 3: Selectors + Stage Inspector Post-Measurement
### Work
1. Update selectors to aggregate distributions from weighted branches.
2. Compute Bloch pair visuals from ensemble expectation at each stage.
3. Ensure measurement-stage inspector shows post-measurement state.

### Deliverable
1. Snapshot cards + inspector align with partial measurement semantics.
2. Post-measurement stage visual and probabilities are consistent.
3. Typecheck/tests/build pass.

### Stop Point
Manual review of stage UI behavior.

## Phase 4: Runtime Sampling with In-Circuit Measurement
### Work
1. Add sampled execution path that samples each `M` gate during a run.
2. Continue simulation from sampled collapsed branch.
3. Keep right-panel bars as expected distribution across all branches.
4. Keep repeated measurement clicks restarting from prepared state.

### Deliverable
1. Measurement button behavior matches in-circuit measurement semantics.
2. Recent samples reflect stochastic branch choices.
3. Typecheck/tests/build pass.

### Stop Point
Manual review of measurement UX.

## Phase 5: Test Expansion + Hardening
### Work
1. Add regression tests:
   - Bell-state partial measurement collapse,
   - branch distribution correctness,
   - lock behavior across add/remove columns/qubits.
2. Add deterministic sampling tests (seeded random path).
3. Final cleanup and docs.

### Deliverable
1. Stable coverage of partial measurement behavior.
2. All checks green.
3. Ready for sign-off.
