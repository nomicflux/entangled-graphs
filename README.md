# Entangled Graphs

Interactive quantum circuit playground with a free-form builder and an algorithm walkthrough.

Live site: [https://nomicflux.github.io/entangled-graphs/](https://nomicflux.github.io/entangled-graphs/)

## What You’ll See

The app has three top-level tabs:

1. **Free-Form**
- Build and run your own circuits.
- The page is split into:
- **Prepared State (left)**
- Configure each qubit (`Q0`, `Q1`, …) with Bloch sliders (`theta`, `phi`).
- Use quick presets for common states:
  - `100% |0>`
  - `100% |1>`
  - `50/50`
- **Circuit (middle)**
- Time moves left to right by columns.
- Click/drag gates into slots on qubit rows.
- Supports single-qubit, multi-qubit, and custom gates.
- Measurement gates (`M`) can be placed in-circuit.
- **Measurement (right)**
- Click **Measure** to run a sample from the prepared state through the circuit.
- View output probabilities and recent sample outcomes.
- If in-circuit measurements exist, you can resample from specific measurement points.

2. **p-adic**
- Free-form circuit workspace with p-adic preparation and model-weighted measurement.
- The page is also split into:
- **Prepared State (left)**
  - Qubit count starts at `2`, can be adjusted from `1..8`.
  - Per-qubit amplitudes are entered explicitly as raw values (`a`, `b`), including simple `p` expressions.
  - Prime selector is limited to `p in {2, 3, 5, 7}`.
- **Circuit (middle)**
  - Same interaction model as free-form (drag single-qubit, staged multi-wire, in-circuit `M` row lock).
  - Includes a `p-adic State Map` tied to selected stage snapshots.
  - Geometry modes:
    - `padic_vector` (digit-vector/fractal-style embedding from base-`p` digits)
    - `valuation_ring` (radius from valuation-derived norm, angle from residue class)
  - Includes transition replay animation between stage selections.
  - Gate palette only shows p-adic-supported gates:
    - 1 qubit: `I`, `X`, `Z`, `M`
    - 2 qubits: plus `CNOT`, `SWAP`
    - 3+ qubits: plus `TOFFOLI`, `CSWAP`
  - Custom gate builders are not shown in p-adic v1.
- **Measurement (right)**
  - Measurement model is selectable:
    - `valuation_weight`
    - `character_based`
    - `operator_ensemble`
  - Results are shown as normalized model weights `w_p` and support replay/resample from in-circuit measurement points.
  - Includes a `p-adic Value Inspector` table with per-basis:
    - `w_raw`, `w_p`, `v_p`, `|.|_p`, residue class, base-`p` digits.

3. **Algorithms**
- Contains guided algorithm views.
- Current algorithm views:
  - **Teleportation**
  - **Deutsch**

## How To Use It

### Free-Form
1. Set your initial qubit states in **Prepared State**.
2. Build a circuit in the center panel.
3. Click **Measure** to sample outcomes.
4. Compare:
- Stage snapshots in the circuit panel
- Final output distribution in the measurement panel
- Recent sample history

### p-adic
1. Switch to **p-adic**.
2. Set prime `p` (`2`, `3`, `5`, or `7`) and qubit count (`1..8`).
3. Enter prepared amplitudes for each qubit (`a`, `b`) or use presets.
4. Build a circuit with the available p-adic gate palette.
5. Choose a measurement model and click **Measure**.
6. Compare:
- Model-weighted stage snapshots and Stage Inspector (`w_p` labels)
- p-adic State Map geometry + transition flow
- p-adic Value Inspector per-basis metrics
- Final output distribution (`w_p`)
- In-circuit outcome path and resample points

### Teleportation (Algorithms tab)
1. Switch to **Algorithms** and open **Teleportation**.
2. Set source `|q0⟩` with sliders/presets.
3. Inspect the fixed teleportation backbone and stage snapshots.
4. In **Teleportation Outputs**:
- Toggle correction mode:
  - `Auto` applies `Z(m0)` and `X(m1)`.
  - `Manual` lets you choose `Z` and `X` separately.
- Click **Run Sample** to execute one sampled run.
- Use **Resample from this point** on in-circuit measurement outcomes to replay from that measurement onward.
5. Compare:
- Expected output distribution for the current correction mode
- Sampled output distribution
- Fidelity to source and branch table details

### Deutsch (Algorithms tab)
1. Switch to **Algorithms** and open **Deutsch**.
2. In **Select** mode:
- Choose one oracle from the standard four (`f=0`, `f=1`, `f=x`, `f=not x`).
- Edit `q0` and `q1` inputs if you want to probe non-canonical setups.
3. Inspect the fixed Deutsch backbone:
- Starts from your prepared `|q0 q1⟩` with an explicit initial `X` on `q1`,
- then `H` layer, `U_f`, and final `H` on `q0`.
4. In **Results**:
- Read expected `q0` verdict (`constant` vs `balanced`) and full 2-qubit distribution.
- Run sampled executions to compare sampled vs expected verdicts.
5. Use **Guess** mode to hide oracle identity:
- infer class from outputs/interference,
- submit guess (`constant` or `balanced`),
- reveal correctness, then start a new hidden round.

## In-Circuit Measurement Behavior

- `M` measures one row at its column.
- After an `M`, that row is locked for later columns.
- `M` collapses the state branch at that point (no automatic qubit reset/reprepare).
- Entanglement effects propagate to other rows through the state.
- You can replay from any in-circuit measurement point in the Measurement panel.
- In p-adic mode, branch and final distributions are interpreted as normalized model weights (`w_p`) under the selected measurement model.
- In p-adic mode, stage-map coordinates come from selected geometry mode and do not change computed `w_p`.

## Entanglement Visualization

- Entanglement is shown directly on the circuit columns as arcs between rows.
- Pairwise arcs:
  - Color reflects dominant Bell-basis component.
  - Thickness/opacity reflect Bell-derived strength.
- Multipartite bands:
  - Highlight components with 3+ qubits that are entangled as one component.
  - Strength uses **minimum cut entropy** across cuts that split that component:
    - `strength(C) = min S(rho_A)` over all bipartitions `A | C\\A` of component `C`.
- Arcs appear where entanglement increases along the circuit timeline.
- Hovering an arc or band shows its exact rows and strength metric.

In the Teleportation view, these overlays stay active on the fixed algorithm backbone.
In the Deutsch view, overlays and stage snapshots update with oracle/input changes.

### Notes and Limits

- Multipartite overlays appear only when a `3+` qubit component exceeds strength thresholds used to keep the view readable.
- Bell-arc strength is Bell-basis-derived and highlights dominant pairwise character; it is not a full entanglement monotone.
- Multipartite strength is cut-entropy-based and is strongest for highly non-separable components; near-zero values are visually suppressed.

## Custom Gates

- You can create custom single-qubit and multi-qubit gates from the circuit tools.
- Custom gates are saved and can be reused.
- Alt-click a custom gate chip to delete it.
- p-adic workspace does not expose custom gate builders in v1.

## p-adic Known Limitations

- p-adic amplitudes are currently normalized and evolved through the existing complex-number operator pipeline, then re-weighted by the selected p-adic measurement model.
- Stage map geometry is a deterministic embedding proxy (`padic_vector` / `valuation_ring`), not a full p-adic manifold reconstruction.
- Bloch visualization is retained as a secondary derived projection; p-adic map + inspector are the primary views.
- p-adic v1 gate set is intentionally limited to built-ins listed above.
- No p-adic custom gate builder in v1.
- Prime choices are restricted to `{2, 3, 5, 7}`.

## Project Layout

- `src/components/` UI panels and interactions
- `src/components/padic/` p-adic workspace panels and interactions
- `src/state/` state model, selectors, and actions
- `src/quantum/` quantum simulation, measurement, Bloch, and entanglement logic
- `src/quantum/padic/` p-adic parsing, model weighting, ensemble simulation, and sampling modules
- `src/operator.ts` built-in and constructed operators
- `tests/` behavior and regression tests
- `docs/current-plans/` active implementation plans
