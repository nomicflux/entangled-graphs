# UI Principles and Vue Quickstart

This document captures two things:
1. The visual/system principles used for the current UI.
2. A fast Vue tutorial to get from zero to the current app structure.

## Part 1: UI Principles Behind the Current Look

### 1) Visual Direction: Scientific + Atmospheric
- Use a dark, layered background with radial + linear gradients to avoid flatness.
- Keep cards semi-translucent (glass feel) so the background contributes depth.
- Use one dominant accent and one secondary accent to separate interaction and structure.

Where this lives now:
- `src/styles/foundation.css` (`body`, color tokens)
- `src/styles/panels.css` (`.panel`, `.status-pill`)

Code snippet:
```css
/* src/styles/foundation.css */
:root {
  --panel: rgba(255, 255, 255, 0.08);
  --accent: #66f5d6;
  --accent-2: #fca5ff;
}

body {
  background: radial-gradient(circle at top left, #1b2c5d 0%, transparent 45%),
    radial-gradient(circle at 20% 80%, #2b145f 0%, transparent 50%),
    linear-gradient(135deg, #0b1020 0%, #0c1428 50%, #0e0f1d 100%);
}
```

```css
/* src/styles/panels.css */
.panel {
  background: var(--panel);
  border: 1px solid var(--panel-border);
  backdrop-filter: blur(14px);
}
```

### 2) Typography: Clear Roles
- Title font: geometric/sans display for hierarchy and product identity.
- Data font: monospace for scientific values, labels, and gate symbols.
- Keep text hierarchy explicit: kicker, title, subtitle, section title, metadata.

Where this lives now:
- `src/styles/foundation.css` (`@import` fonts, base text)
- `src/styles/layout.css` (`.kicker`, `.subtitle`)
- `src/styles/prep-panel.css` and `src/styles/circuit-panel.css` (monospace labels)

Code snippet:
```css
/* src/styles/foundation.css */
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600&display=swap");

body {
  font-family: "Space Grotesk", "Segoe UI", sans-serif;
}
```

```css
/* src/styles/prep-panel.css */
.amp-label {
  font-family: "IBM Plex Mono", monospace;
}
```

### 3) Layout: Functional Three-Panel Workflow
- Left: state preparation.
- Middle: circuit timeline.
- Right: measurement and outcomes.
- Make information flow left to right to match user mental model.
- Collapse to single column on small screens with predictable order.

Where this lives now:
- `src/App.vue`
- `src/styles/layout.css` (`.panels`, media query)

Code snippet:
```vue
<!-- src/App.vue -->
<main class="panels">
  <PrepPanel />
  <CircuitPanel />
  <MeasurementPanel />
</main>
```

```css
/* src/styles/layout.css */
.panels {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(360px, 1.4fr) minmax(260px, 1fr);
}

@media (max-width: 980px) {
  .panels {
    grid-template-columns: 1fr;
  }
}
```

### 4) Component Boundaries by Domain
- Keep each major area as its own component.
- Keep view styles isolated by domain (prep, circuit, measurement).
- Keep one CSS entrypoint, but split actual rules by subject.

Where this lives now:
- Components: `src/components/PrepPanel.vue`, `src/components/CircuitPanel.vue`, `src/components/MeasurementPanel.vue`
- CSS split: `src/styles/*.css`
- CSS entry: `src/style.css`

Code snippet:
```ts
// src/main.ts
import App from "./App.vue";
import "./style.css";
```

```css
/* src/style.css */
@import "./styles/foundation.css";
@import "./styles/layout.css";
@import "./styles/prep-panel.css";
@import "./styles/circuit-panel.css";
@import "./styles/measurement-panel.css";
```

### 5) States Should Be Valid by Construction
- UI controls should represent the state space directly.
- Avoid patching invalid data with clamping.
- For single-qubit preparation, edit Bloch parameters and derive amplitudes.

Where this lives now:
- `src/state.ts` (`preparedBloch`, `qubitFromBloch`, `preparedQubits`)
- `src/components/PrepPanel.vue` (slider inputs for `theta`, `phi`)

Code snippet:
```ts
// src/state.ts
export type BlochParams = {
  theta: number;
  phi: number;
};

export const state = reactive<CircuitState>({
  preparedBloch: [
    { theta: 0, phi: 0 },
    { theta: 0, phi: 0 },
  ],
  columns: [emptyColumn(), emptyColumn(), emptyColumn(), emptyColumn()],
});

export function qubitFromBloch(params: BlochParams): Qubit {
  const halfTheta = params.theta / 2;
  const magnitude = Math.sin(halfTheta);
  return {
    a: complex.complex(Math.cos(halfTheta), 0),
    b: complex.complex(Math.cos(params.phi) * magnitude, Math.sin(params.phi) * magnitude),
  };
}
```

```vue
<!-- src/components/PrepPanel.vue -->
<input v-model.number="q.theta" type="range" :min="0" :max="Math.PI" :step="0.01" />
<input v-model.number="q.phi" type="range" :min="0" :max="2 * Math.PI" :step="0.01" />
```

### 6) Interaction Readiness
- Even in placeholder phases, keep affordances visible.
- Show gate palette and slots before drag/drop to establish interaction model.
- Keep measurement card structure ready so logic can be layered in without redesign.

Where this lives now:
- `src/components/CircuitPanel.vue`
- `src/components/MeasurementPanel.vue`

Code snippet:
```vue
<!-- src/components/CircuitPanel.vue -->
<div class="gate-palette">
  <span v-for="gate in gates" :key="gate" class="gate-chip">{{ gate }}</span>
</div>

<div class="circuit-columns">
  <div v-for="(column, colIndex) in state.columns" :key="colIndex" class="circuit-column">
    <div v-for="(cell, rowIndex) in column" :key="rowIndex" class="gate-slot">
      <div class="gate-token" :class="{ empty: !cell }">{{ cell ?? "" }}</div>
    </div>
  </div>
</div>
```

```vue
<!-- src/components/MeasurementPanel.vue -->
<button class="measure-btn" disabled>Measure</button>
<div class="measurement-readout">
  <div class="readout-row"><span class="label">Outcome</span><span class="value">--</span></div>
  <div class="readout-row"><span class="label">Probability</span><span class="value">--</span></div>
</div>
```

### 7) Motion Rules
- Use small, meaningful animations only where they communicate state change.
- Example: Bloch dot transition for parameter changes.
- Avoid broad decorative motion that competes with scientific interpretation.

Where this lives now:
- `src/styles/prep-panel.css` (`.bloch-dot` transition)

Code snippet:
```css
/* src/styles/prep-panel.css */
.bloch-dot {
  transform: translate(0, 0);
  transition: transform 0.3s ease;
}
```

## Part 2: Quick Vue Tutorial to Reach Current State

### Step 1: Install and run Vue with Vite

From project root:

```bash
npm install
npm run dev
```

Expected core setup:
- `vite.config.ts` with Vue plugin.
- `index.html` with `#app` mount and module script.
- `src/main.ts` mounting Vue root component.

Code snippet:
```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
});
```

```html
<!-- index.html -->
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

```ts
// src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

createApp(App).mount("#app");
```

### Step 2: Build a root app shell

Create `src/App.vue` with:
- Header section (`kicker`, title, subtitle).
- Main three-column container.
- Three child components:
  - `PrepPanel`
  - `CircuitPanel`
  - `MeasurementPanel`

Code snippet:
```vue
<!-- src/App.vue -->
<template>
  <div class="app">
    <header class="app-header">
      <div>
        <p class="kicker">Entangled Graphs</p>
        <h1>Qubit Workshop</h1>
        <p class="subtitle">Prepare a two-qubit state, build a circuit, then measure.</p>
      </div>
      <span class="status-pill">Phase 1: Layout</span>
    </header>

    <main class="panels">
      <PrepPanel />
      <CircuitPanel />
      <MeasurementPanel />
    </main>
  </div>
</template>
```

### Step 3: Add a lightweight shared state model

Create `src/state.ts` using Vue reactivity.

Current model includes:
- `GateId`, `GateCell`, `CircuitColumn`
- `preparedBloch: [BlochParams, BlochParams]`
- `columns: CircuitColumn[]`
- `qubitFromBloch()` helper
- `preparedQubits` computed value

Code snippet:
```ts
// src/state.ts
export type GateId = "I" | "X" | "H" | "S";
export type GateCell = GateId | null;
export type CircuitColumn = [GateCell, GateCell];

export const preparedQubits = computed<[Qubit, Qubit]>(() => [
  qubitFromBloch(state.preparedBloch[0]),
  qubitFromBloch(state.preparedBloch[1]),
]);
```

### Step 4: Implement panel components

#### Prep panel
- Bind sliders to `theta` and `phi`.
- Render a Bloch-style dot from those parameters.
- Display derived amplitudes read-only.

Code snippet:
```vue
<!-- src/components/PrepPanel.vue -->
<div class="amp-row">
  <span class="amp-label">theta</span>
  <label>
    0..pi
    <input v-model.number="q.theta" type="range" :min="0" :max="Math.PI" :step="0.01" />
  </label>
  <output>{{ q.theta.toFixed(2) }}</output>
</div>
```

```ts
// src/components/PrepPanel.vue <script setup>
const dotStyle = (q: BlochParams) => {
  const x = Math.sin(q.theta) * Math.cos(q.phi) * previewRadius;
  const y = Math.sin(q.theta) * Math.sin(q.phi) * previewRadius;
  return { transform: `translate(${x}px, ${-y}px)` };
};
```

#### Circuit panel
- Show gate palette (`I`, `X`, `H`, `S`).
- Render time-stepped columns with two qubit rows.
- Keep slot visuals ready for drag/drop phase.

Code snippet:
```vue
<!-- src/components/CircuitPanel.vue -->
<div class="circuit-columns">
  <div v-for="(column, colIndex) in state.columns" :key="colIndex" class="circuit-column">
    <div v-for="(cell, rowIndex) in column" :key="rowIndex" class="gate-slot">
      <span class="gate-slot-label">q{{ rowIndex }}</span>
      <div class="gate-token" :class="{ empty: !cell }">{{ cell ?? "" }}</div>
    </div>
  </div>
</div>
```

#### Measurement panel
- Render button + readout placeholders.
- Keep history area visible for later sampling integration.

Code snippet:
```vue
<!-- src/components/MeasurementPanel.vue -->
<div class="measurement-card">
  <button class="measure-btn" disabled>Measure</button>
  <div class="measurement-readout">
    <div class="readout-row"><span class="label">Outcome</span><span class="value">--</span></div>
    <div class="readout-row"><span class="label">Probability</span><span class="value">--</span></div>
  </div>
</div>
```

### Step 5: Organize CSS by concern

Use one entry stylesheet and split rules into domain files.

Code snippet:
```css
/* src/style.css */
@import "./styles/foundation.css";
@import "./styles/layout.css";
@import "./styles/panels.css";
@import "./styles/prep-panel.css";
@import "./styles/circuit-panel.css";
@import "./styles/measurement-panel.css";
```

### Step 6: Keep iteration disciplined

When adding new behavior (drag/drop, gate propagation, measurement):
- Add state and pure helpers in `src/state.ts` or dedicated logic files.
- Keep panel components mostly declarative.
- Keep style changes in the relevant `src/styles/*` file.
- Prefer representable state models over defensive display fixes.

Code snippet pattern:
```ts
// state-first approach
export function applyGatePipeline(prepared: PreparedState, columns: CircuitColumn[]): IntermediateState[] {
  // pure transform, no DOM side effects
  return [];
}
```

```vue
<!-- view consumes state, avoids embedding math -->
<template>
  <div>{{ viewModel.summary }}</div>
</template>
```

## Next tutorial milestone

After this baseline, the next incremental tutorial should cover:
1. Two-qubit state vector math and gate application pipeline.
2. Per-column intermediate state snapshots.
3. Measurement sampling on each click without collapsing prepared-state visuals.
