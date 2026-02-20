# Entangled Graphs

Interactive quantum circuit playground with a free-form builder and an algorithm walkthrough.

Live site: [https://nomicflux.github.io/entangled-graphs/](https://nomicflux.github.io/entangled-graphs/)

## What You’ll See

The app has two top-level tabs:

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

2. **Algorithms**
- Contains guided algorithm views.
- Current algorithm: **Teleportation**.

## How To Use It

### Free-Form
1. Set your initial qubit states in **Prepared State**.
2. Build a circuit in the center panel.
3. Click **Measure** to sample outcomes.
4. Compare:
- Stage snapshots in the circuit panel
- Final output distribution in the measurement panel
- Recent sample history

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

## In-Circuit Measurement Behavior

- `M` measures one row at its column.
- After an `M`, that row is locked for later columns.
- `M` collapses the state branch at that point (no automatic qubit reset/reprepare).
- Entanglement effects propagate to other rows through the state.
- You can replay from any in-circuit measurement point in the Measurement panel.

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

## Custom Gates

- You can create custom single-qubit and multi-qubit gates from the circuit tools.
- Custom gates are saved and can be reused.
- Alt-click a custom gate chip to delete it.

## Project Layout

- `src/components/` UI panels and interactions
- `src/state/` state model, selectors, and actions
- `src/quantum/` quantum simulation, measurement, Bloch, and entanglement logic
- `src/operator.ts` built-in and constructed operators
- `tests/` behavior and regression tests
- `docs/current-plans/` active implementation plans
