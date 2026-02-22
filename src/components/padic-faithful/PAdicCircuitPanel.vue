<template>
  <section class="panel panel-center padic-circuit-panel">
    <div class="panel-header">
      <h2>p-adic Circuit</h2>
      <p>Build a wire-by-wire gate sequence. This restores the circuit workflow view for the p-adic page.</p>
    </div>

    <div class="circuit-tools">
      <div class="gate-palette">
        <p class="gate-group-title">Gate Palette</p>
        <div class="gate-group-chips">
          <button
            v-for="gate in gates"
            :key="gate"
            type="button"
            class="gate-chip"
            :class="{ selected: pAdicFaithfulState.selectedGate === gate, 'measurement-chip': gate === 'M' }"
            @click="setFaithfulSelectedGate(pAdicFaithfulState.selectedGate === gate ? null : gate)"
          >
            {{ gate }}
          </button>
        </div>
        <p class="padic-circuit-tool-label">active tool: {{ activeToolLabel }}</p>
        <p class="padic-circuit-tool-note">I is identity. Alt+Click a slot clears that slot.</p>
      </div>

      <div class="column-controls">
        <button class="column-btn" type="button" @click="addFaithfulColumn">Add column</button>
        <button class="column-btn" type="button" :disabled="pAdicFaithfulState.columns.length === 0" @click="removeFaithfulColumn">
          Remove column
        </button>
      </div>
    </div>

    <div class="circuit-shell">
      <div class="circuit-columns">
        <div
          v-for="(column, columnIndex) in pAdicFaithfulState.columns"
          :key="`padic-column-${columnIndex}`"
          class="circuit-column"
          :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
        >
          <div
            v-for="row in rows"
            :key="`padic-slot-${columnIndex}-${row}`"
            class="gate-slot"
            @click="handleSlotClick($event, columnIndex, row)"
          >
            <span class="gate-slot-label">q{{ row }}</span>
            <div class="gate-token" :class="tokenClasses(column.gates[row] ?? null)">
              {{ column.gates[row] ?? "·" }}
            </div>
          </div>
        </div>
      </div>
      <div class="circuit-legend">
        <span class="circuit-legend-time">Time -></span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  addFaithfulColumn,
  pAdicFaithfulState,
  removeFaithfulColumn,
  setFaithfulColumnGate,
  setFaithfulSelectedGate,
} from "../../padic-faithful";

const gates = ["I", "X", "Z", "M"] as const;

const rows = computed(() =>
  Array.from({ length: pAdicFaithfulState.qubitCount }, (_, index) => index),
);

const handleSlotClick = (event: MouseEvent, columnIndex: number, rowIndex: number): void => {
  if (event.altKey) {
    setFaithfulColumnGate(columnIndex, rowIndex, null);
    return;
  }

  const selected = pAdicFaithfulState.selectedGate;
  if (!selected) {
    return;
  }
  setFaithfulColumnGate(columnIndex, rowIndex, selected);
};

const tokenClasses = (gate: (typeof gates)[number] | null): Record<string, boolean> => ({
  empty: gate === null,
  "is-measurement": gate === "M",
});

const activeToolLabel = computed(() => {
  const selected = pAdicFaithfulState.selectedGate;
  if (selected === null) {
    return "none";
  }
  if (selected === "I") {
    return "I (identity)";
  }
  return selected;
});
</script>
