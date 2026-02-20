# Multipartite Entanglement Visualization Plan

## Goal
Extend circuit entanglement overlays beyond pairwise Bell-style arcs so genuine n-partite entanglement (3+ qubits) is visible in-column.

## Why This Is Needed
Current visualization uses pairwise Bell-derived strength only. This can miss true multipartite entanglement where:
1. Global state is entangled.
2. Pairwise marginals show little/no entanglement.

## Scope
1. Keep existing pairwise arcs.
2. Add multipartite detection and rendering for algorithm and free-form circuit views.
3. Start with n up to current UI max (8 qubits), optimize for interactive use.

## Phase 1: Entropy-by-Cut Backend
### Work
1. Add reduced density matrix utilities for arbitrary subsystem `A`.
2. Add von Neumann entropy computation `S(rho_A)`.
3. For each stage snapshot (ensemble-aware), compute entanglement across non-trivial bipartitions.
4. Add thresholds/epsilon handling and deterministic tests.

### Deliverable
1. API returns per-stage cut-entanglement scores.
2. Unit tests validate known separable, Bell, and GHZ-like cases.

### Stop Point
Review numerical stability and performance.

## Phase 2: Multipartite Component Extraction
### Work
1. Build component extraction from cut results:
   - qubits are in same component if no zero-entanglement cut cleanly separates them.
2. Distinguish component sizes:
   - size 2: pairwise component
   - size >= 3: multipartite component
3. Add stage-level model objects for renderer consumption.

### Deliverable
1. Per-stage entanglement component model exists and is test-covered.
2. Cases with tripartite entanglement correctly produce 3-qubit components.

### Stop Point
Review interpretation against teleportation stages.

## Phase 3: Circuit Rendering (In-Column)
### Work
1. Keep existing arc rendering for pairwise components.
2. Add multipartite overlays for size >= 3:
   - soft hull/band spanning involved rows in the active column
   - opacity/weight from component strength
3. Keep visuals non-obstructive to gate tokens and connectors.

### Deliverable
1. Pairwise + multipartite overlays render together.
2. Teleportation circuit visibly marks multipartite stages where expected.

### Stop Point
Manual visual review (readability, overlap, density).

## Phase 4: Strength Semantics + Legends
### Work
1. Define component strength metric:
   - default: min-cut entropy across component-supporting cuts
2. For 3-qubit pure-state snapshots, optionally add 3-tangle support as enhanced indicator.
3. Add compact legend/tooltips for meaning of arcs vs hulls.

### Deliverable
1. Strength mapping is mathematically defined and documented.
2. User-facing legend clarifies pairwise vs multipartite signals.

### Stop Point
Review pedagogy and cognitive load.

## Phase 5: Performance + Hardening
### Work
1. Cache stage entanglement computations.
2. Avoid recompute storms on minor UI interactions.
3. Add regression tests for:
   - teleportation stages
   - n-qubit free-form examples
   - measurement branch behavior
4. Document behavior and limitations in README.

### Deliverable
1. Stable interactive performance.
2. Full test pass with multipartite coverage.
3. Ready for production use.

## Open Decisions (To Confirm Later)
1. Final multipartite overlay shape style (hull vs vertical band vs contour).
2. Whether 3-tangle is mandatory in v1 or deferred.
3. Exact epsilon defaults for cut-entanglement classification.
