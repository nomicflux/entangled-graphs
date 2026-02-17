# N-Qubit Expansion Plan

## Scope
Expand the current fixed two-qubit system to support dynamic qubit counts, staged multi-qubit gate placement, and full-distribution visualization up to 8 qubits.

## Locked Decisions
1. Supported qubit count: `1..8`
2. Added qubit default state: `|0>`
3. Qubit removal behavior: auto-delete affected gates
4. `CNOT` placement UX: click control, then click target, with live cursor-follow line preview
5. `Toffoli` placement UX: explicit 3-step flow (`control1 -> control2 -> target`)
6. Column composition: allow multiple disjoint multi-qubit gates in the same column
7. Probability display for larger `N`: full basis distribution bars (`2^N`) and per-qubit clouds
8. Gate validity on qubit-count reduction: auto-remove now-invalid gates

## Phase 1: N-Qubit Core Refactor
### Deliverables
1. Replace fixed prepared-state shape with dynamic qubit array in `/Users/demouser/Code/entangled-graphs/src/state.ts`
2. Add qubit controls: `addQubit()`, `removeQubit(...)`, `setQubitCount(n)` with hard clamp to `1..8`
3. New qubits initialize to `|0>`
4. Qubit removal cleans up all gates touching removed wire indices
5. Add dynamic basis-label support (`|000...0>`) for arbitrary `N`

## Phase 2: Circuit Model for Disjoint Multi-Gate Columns
### Deliverables
1. Replace current column model with gate instances per column
2. Add typed gate instance model:
   - single-qubit gate: one wire
   - `CNOT`: two wires
   - `Toffoli`: three wires
3. Enforce no wire-overlap inside a column while allowing disjoint gates in same column
4. Auto-prune invalid gate instances after qubit-count changes
5. Palette gating rules:
   - hide `CNOT` for `N < 2`
   - hide `Toffoli` for `N < 3`

## Phase 3: Generic N-Qubit Simulation Engine
### Deliverables
1. Generalize state vector math in `/Users/demouser/Code/entangled-graphs/src/quantum.ts` to size `2^N`
2. Generic single-qubit gate application on arbitrary wire index
3. Generic `CNOT(control,target)` application
4. Generic `Toffoli(control1,control2,target)` application
5. Preserve stage snapshots and repeated measurement sampling flow for all `N <= 8`

## Phase 4: Staged Multi-Qubit Placement UX
### Deliverables
1. Add staged placement state in `/Users/demouser/Code/entangled-graphs/src/components/CircuitPanel.vue`
2. `CNOT` flow:
   - click control row
   - show line/vector preview following cursor
   - click target row to commit
3. `Toffoli` flow:
   - click control1
   - click control2
   - click target
4. Add clear cancel/reset behavior for incomplete staged placement
5. Keep drag/drop for single-qubit gates; use staged flow for `CNOT` and `Toffoli`

## Phase 5: Dynamic Visualization and Full Distribution
### Deliverables
1. Render all qubits through prep/circuit/measurement views dynamically
2. Per-qubit cloud visualization partitions sphere vertically into `N` regions (equal bands)
3. Render full measurement distribution (`2^N` bars) for all supported counts
4. Keep performance acceptable at `N=8` (256 basis states)
5. Final UX cleanup and regression pass

## Validation Criteria
1. Qubit count changes are stable across all panels and simulation paths
2. Multi-qubit gate placement is explicit, valid, and unambiguous
3. Invalid gates are removed when qubit count drops below requirements
4. `CNOT` and `Toffoli` simulation behavior matches expected truth-table behavior
5. Full distribution bars and cloud regions update correctly at each stage
6. `npx tsc --noEmit` passes
7. `npm run build` passes
