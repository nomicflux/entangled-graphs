# Entangled Graphs

Interactive quantum circuit playground.

Live site: [https://nomicflux.github.io/entangled-graphs/](https://nomicflux.github.io/entangled-graphs/)

## What You’ll See

The page is split into three working areas:

1. **Prepared State (left)**
- Configure each qubit (`Q0`, `Q1`, …) with Bloch sliders (`theta`, `phi`).
- Use quick presets for common states:
  - `100% |0>`
  - `100% |1>`
  - `50/50`

2. **Circuit (middle)**
- Time moves left to right by columns.
- Click/drag gates into slots on qubit rows.
- Supports single-qubit, multi-qubit, and custom gates.
- Measurement gates (`M`) can be placed in-circuit.

3. **Measurement (right)**
- Click **Measure** to run a sample from the prepared state through the circuit.
- View output probabilities and recent sample outcomes.
- If in-circuit measurements exist, you can resample from specific measurement points.

## How To Use It

1. Set your initial qubit states in **Prepared State**.
2. Build a circuit in the center panel.
3. Click **Measure** to sample outcomes.
4. Compare:
- Stage snapshots in the circuit panel
- Final output distribution in the measurement panel
- Recent sample history

## In-Circuit Measurement Behavior

- `M` measures one row at its column.
- After an `M`, that row is locked for later columns.
- `M` collapses the state branch at that point (no automatic qubit reset/reprepare).
- Entanglement effects propagate to other rows through the state.
- You can replay from any in-circuit measurement point in the Measurement panel.

## Entanglement Visualization

- Entanglement is shown directly on the circuit columns as arcs between rows.
- Arc color reflects dominant Bell-basis component.
- Arc intensity reflects entanglement strength.
- Arcs appear where entanglement increases along the circuit timeline.

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
