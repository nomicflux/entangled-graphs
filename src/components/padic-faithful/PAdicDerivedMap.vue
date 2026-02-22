<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>Derived Geometry</h2>
      <p>Explicitly derived from omega_i rows. Primary semantics remain in the valuation-shell tables.</p>
    </div>

    <div class="padic-faithful-controls">
      <label class="qubit-count-field geometry-mode-field">
        View
        <select :value="pAdicFaithfulState.viewMode" @change="handleModeChange">
          <option value="valuation_ring">valuation_ring</option>
          <option value="digit_vector">digit_vector</option>
        </select>
      </label>
    </div>

    <svg class="padic-map-svg" viewBox="0 0 100 100" role="img" aria-label="derived p-adic geometry">
      <circle cx="50" cy="50" r="44" class="padic-map-ring" />
      <circle cx="50" cy="50" r="30" class="padic-map-ring" />
      <circle cx="50" cy="50" r="16" class="padic-map-ring" />

      <line
        v-if="pAdicFaithfulState.viewMode === 'valuation_ring'"
        v-for="residue in residueAngles"
        :key="`residue-${residue.residue}`"
        class="padic-map-residue-axis"
        :x1="50"
        :y1="50"
        :x2="xFor(Math.cos(residue.angle) * 0.96)"
        :y2="yFor(Math.sin(residue.angle) * 0.96)"
      />

      <g v-for="node in faithfulDerivedNodes" :key="node.id" class="padic-map-node">
        <circle :cx="xFor(node.x)" :cy="yFor(node.y)" :r="nodeRadius(node.norm)">
          <title>
            {{ node.label }}: v_p={{ faithfulDisplay.formatValuation(node.valuation) }}, |.|_p={{ faithfulDisplay.formatScalar(node.norm) }},
            w_norm={{ faithfulDisplay.formatScalar(node.wNorm) }}
          </title>
        </circle>
        <text :x="xFor(node.x)" :y="yFor(node.y) + 0.6" class="padic-map-label">{{ node.label }}</text>
      </g>
    </svg>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  faithfulDerivedNodes,
  faithfulDisplay,
  pAdicFaithfulState,
  setFaithfulViewMode,
} from "../../padic-faithful";

const residueAngles = computed(() =>
  Array.from({ length: Math.max(2, pAdicFaithfulState.prime) }, (_, residue) => ({
    residue,
    angle: (2 * Math.PI * residue) / Math.max(2, pAdicFaithfulState.prime),
  })),
);

const handleModeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  setFaithfulViewMode(target.value);
};

const xFor = (x: number): number => 50 + (x * 42);
const yFor = (y: number): number => 50 - (y * 42);

const nodeRadius = (norm: number): number => {
  if (!Number.isFinite(norm) || norm <= 0) {
    return 2;
  }
  const scaled = Math.min(1, norm / (1 + norm));
  return 2 + (6 * scaled);
};
</script>
