<template>
  <section class="panel panel-center padic-derived-panel">
    <div class="panel-header">
      <h2>Derived Geometry</h2>
      <p>Fractal/ring p-adic projection over full rho[i,j] entries (same mapping as stage cards).</p>
    </div>

    <div class="padic-faithful-controls">
      <label class="qubit-count-field geometry-mode-field">
        View
        <select :value="pAdicFaithfulState.viewMode" @change="handleModeChange">
          <option value="digit_vector">digit_vector (fractal)</option>
          <option value="valuation_ring">valuation_ring</option>
        </select>
      </label>
    </div>

    <PAdicNumericGlyph
      detail
      :entries="entriesForGlyph(finalStageEntries)"
      :prime="pAdicFaithfulState.prime"
      :mode="pAdicFaithfulState.viewMode"
      aria-label="derived p-adic fractal geometry"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  faithfulStageViews,
  pAdicFaithfulState,
  setFaithfulViewMode,
  type PAdicOperatorEntryRow,
} from "../../padic-faithful";
import PAdicNumericGlyph from "./PAdicNumericGlyph.vue";

const handleModeChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  setFaithfulViewMode(target.value);
};

const finalStageEntries = computed(() =>
  faithfulStageViews.value[faithfulStageViews.value.length - 1]?.entries ?? [],
);

const entriesForGlyph = (entries: ReadonlyArray<PAdicOperatorEntryRow>): ReadonlyArray<PAdicOperatorEntryRow> =>
  entries;
</script>
