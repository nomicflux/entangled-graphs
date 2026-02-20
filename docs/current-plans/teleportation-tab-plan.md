# Teleportation Tab Plan

## Goal
Add a tabbed experience with:
1. `Free-Form` workspace (current behavior)
2. `Algorithms` workspace with a `Teleportation` view

Use the existing visualization assets wherever possible and build a clear demonstration of teleportation using the project definition of:

`tau = 1/2(|00>|q0> + |01>X|q0> + |10>Z|q0> + |11>XZ|q0>)`

## Locked Product Decisions
1. Top-level tabs: `Free-Form | Algorithms`
2. Teleportation appears inside Algorithms.
3. Teleportation state persists when switching tabs.
4. Teleportation circuit is editable only in limited places:
   - tau prep segment
   - manual correction controls (`X/Z`)
5. Tau prep supports both:
   - Bloch sliders
   - prep gates
6. Qubit roles are fixed:
   - `q0`: tau/source qubit
   - `q1`: Alice entangled qubit
   - `q2`: Bob qubit
7. Fixed Bell pair step: `H(q1)` then `CNOT(q1 -> q2)`
8. Correction map: `m1 -> X(q2)`, `m0 -> Z(q2)`
9. Show side-by-side: without correction vs with correction.
10. Support both auto-correction and manual-correction.
11. Show sampled outcomes and expected branch table.
12. Show fidelity + amplitude comparison.
13. Keep entanglement arcs visible in teleportation view.

## Phase 1: Multi-Mode Shell
### Work
1. Add app-level mode tabs: `Free-Form` and `Algorithms`.
2. Add Algorithms sub-tab shell with `Teleportation`.
3. Move current three-panel workspace into a dedicated `FreeFormWorkbench` view (no behavior changes).
4. Add a `Teleportation` scaffold component and algorithm workspace host.
5. Add persisted UI state for selected mode/algorithm tabs.

### Deliverable
1. User can switch between `Free-Form` and `Algorithms`.
2. User can open `Algorithms -> Teleportation` scaffold.
3. Free-Form behavior remains unchanged.
4. Tab selections persist across refresh.

### Stop Point
Manual review before teleportation-specific math/UI.

## Phase 2: Teleportation Layout + Reused Assets
### Work
1. Build teleportation page layout using reused panel/circuit assets.
2. Add fixed three-wire backbone with role labels.
3. Add tau prep segment on q0 (sliders + prep gates).
4. Keep core algorithm stages fixed and visually labeled.
5. Keep entanglement overlays active.

### Deliverable
1. Teleportation page is navigable and visually complete.
2. Tau prep segment is editable; backbone is fixed.
3. Entanglement and stage visuals are visible.

### Stop Point
Manual review before branch/correction engine work.

## Phase 3: Teleportation Engine
### Work
1. Implement teleportation branch evolution from the fixed backbone.
2. Compute/visualize tau decomposition in algorithm context.
3. Generate expected branch table for `m0,m1`.
4. Compute side-by-side outputs:
   - without correction
   - with correction
5. Add fidelity + amplitude comparison outputs.

### Deliverable
1. Teleportation math path is correct and inspectable.
2. Branch table and side-by-side outputs are consistent.
3. Fidelity/comparison views are live.

### Stop Point
Manual review of correctness and pedagogy.

## Phase 4: Correction Controls + Replay UX
### Work
1. Add auto-correction toggle.
2. Add manual `X/Z` correction controls.
3. Reuse replay-from-measurement controls in teleportation flow.
4. Keep sampled vs expected outputs visible and synchronized.

### Deliverable
1. User can run auto and manual correction modes.
2. User can replay from measurement points.
3. Outputs remain coherent across interaction paths.

### Stop Point
Manual UX review.

## Phase 5: Hardening + Docs
### Work
1. Add deterministic tests for basis/superposition/phase teleportation cases.
2. Add tests for correction mapping and branch outputs.
3. Add tests for tab persistence and mode switching.
4. Update README with teleportation workflow guidance.

### Deliverable
1. Teleportation mode has regression coverage.
2. Documentation is updated for users.
3. Ready for next algorithm tabs.
