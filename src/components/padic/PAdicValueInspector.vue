<template>
  <section class="padic-inspector">
    <div class="padic-inspector-head">
      <h3>p-adic Value Inspector</h3>
      <p>Stage: {{ stageLabel }} • p={{ prime }} • {{ measurementModel }}</p>
    </div>

    <div class="padic-inspector-badges">
      <span class="padic-badge primary">Primary p-adic metric</span>
      <span class="padic-badge derived">Derived model metric</span>
    </div>

    <div class="padic-table-wrap">
      <table class="padic-value-table">
        <thead>
          <tr>
            <th>Basis</th>
            <th>w_raw</th>
            <th>w_p</th>
            <th>v_p</th>
            <th>|.|_p</th>
            <th>Residue</th>
            <th>Digits (base p)</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="node in nodes"
            :key="node.basis"
            class="padic-value-row"
            :class="{ selected: selectedBasis === node.basis }"
            @click="handleRowClick(node.basis)"
          >
            <td>|{{ node.basis }}></td>
            <td>{{ formatWeight(node.rawWeight) }}</td>
            <td>{{ formatPercent(node.weight) }}</td>
            <td>{{ formatValuation(node.valuation) }}</td>
            <td>{{ formatWeight(node.norm) }}</td>
            <td>{{ node.residue }}</td>
            <td>{{ node.digits.join(" ") }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="padic-selected-detail">
      <template v-if="selectedNode">
        <p><strong>Selected:</strong> |{{ selectedNode.basis }}></p>
        <p><strong>Point:</strong> ({{ selectedNode.point.x.toFixed(3) }}, {{ selectedNode.point.y.toFixed(3) }})</p>
        <p><strong>Raw -> normalized:</strong> {{ formatWeight(selectedNode.rawWeight) }} -> {{ formatPercent(selectedNode.weight) }}</p>
        <p><strong>Valuation / norm:</strong> v_p={{ formatValuation(selectedNode.valuation) }}, |.|_p={{ formatWeight(selectedNode.norm) }}</p>
        <p><strong>Residue / digits:</strong> {{ selectedNode.residue }} • {{ selectedNode.digits.join(" ") }}</p>
      </template>
      <p v-else class="muted">Select a basis row to inspect detailed p-adic values.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PAdicMeasurementModel } from "../../padic-config";
import type { PAdicVisualizationNode } from "../../types";

const props = defineProps<{
  stageLabel: string;
  prime: number;
  measurementModel: PAdicMeasurementModel;
  nodes: ReadonlyArray<PAdicVisualizationNode>;
  selectedBasis: string | null;
  selectedNode: PAdicVisualizationNode | null;
}>();

const emit = defineEmits<{
  (e: "select-basis", basis: string | null): void;
}>();

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
const formatWeight = (value: number): string => {
  if (value === 0) {
    return "0";
  }
  if (!Number.isFinite(value)) {
    return value > 0 ? "+∞" : "-∞";
  }
  if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e4) {
    return value.toExponential(3);
  }
  return value.toFixed(6);
};

const formatValuation = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "+∞";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
};

const handleRowClick = (basis: string) => {
  emit("select-basis", props.selectedBasis === basis ? null : basis);
};
</script>
