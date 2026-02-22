<template>
  <section class="padic-inspector">
    <div class="padic-inspector-head">
      <h3>p-adic Value Inspector</h3>
      <p>Stage: {{ stageLabel }} • p={{ prime }} • model={{ measurementModel }}</p>
    </div>
    <p class="padic-inspector-context">Primary: ω_i (w_raw), v_p, |.|_p, unit class, base-p digits. Derived: w_norm.</p>

    <div class="padic-table-wrap">
      <table class="padic-value-table">
        <thead>
          <tr>
            <th>Basis</th>
            <th>ω_i (w_raw)</th>
            <th>v_p</th>
            <th>|.|_p</th>
            <th>unit class</th>
            <th>Digits (base p)</th>
            <th>w_norm (Derived)</th>
          </tr>
        </thead>
        <tbody v-for="shell in groupedRows" :key="shell.key">
          <tr class="padic-shell-heading">
            <th colspan="7">valuation shell {{ shellLabel(shell.valuation) }} • {{ shell.rows.length }} outcomes</th>
          </tr>
          <tr
            v-for="row in shell.rows"
            :key="row.basis"
            class="padic-value-row"
            :class="{ selected: selectedBasis === row.basis }"
            @click="handleRowClick(row.basis)"
          >
            <td>|{{ row.basis }}></td>
            <td>{{ formatWeight(row.rawWeight) }}</td>
            <td>{{ formatValuation(row.valuation) }}</td>
            <td>{{ formatWeight(row.norm) }}</td>
            <td>{{ residueClassLabel(row.unitResidue) }}</td>
            <td>{{ row.digits.join(" ") }}</td>
            <td>{{ formatScalar(row.weight) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="padic-selected-detail">
      <template v-if="selectedNode">
        <p><strong>Selected:</strong> |{{ selectedNode.basis }}></p>
        <p><strong>Point:</strong> ({{ selectedNode.point.x.toFixed(3) }}, {{ selectedNode.point.y.toFixed(3) }})</p>
        <p><strong>ω_i:</strong> {{ formatWeight(selectedNode.rawWeight) }}</p>
        <p><strong>v_p / |.|_p:</strong> {{ formatValuation(selectedNode.valuation) }} / {{ formatWeight(selectedNode.norm) }}</p>
        <p><strong>unit class:</strong> {{ residueClassLabel(unitResidueFromRaw(selectedNode.rawWeight, selectedNode.valuation)) }}</p>
        <p><strong>base-p digits:</strong> {{ selectedNode.digits.join(" ") }}</p>
        <p><strong>w_norm (Derived):</strong> {{ formatScalar(selectedNode.weight) }}</p>
      </template>
      <p v-else class="muted">Select a basis row to inspect detailed p-adic values.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
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

type PAdicInspectorRow = PAdicVisualizationNode & {
  unitResidue: number | null;
};

const groupedRows = computed(() => {
  const grouped = new Map<string, { key: string; valuation: number; rows: PAdicInspectorRow[] }>();
  const rows = props.nodes
    .map((node) => ({
      ...node,
      unitResidue: unitResidueFromRaw(node.rawWeight, node.valuation),
    }))
    .sort((left, right) => {
      const leftValuation = Number.isFinite(left.valuation) ? left.valuation : Number.POSITIVE_INFINITY;
      const rightValuation = Number.isFinite(right.valuation) ? right.valuation : Number.POSITIVE_INFINITY;
      if (leftValuation !== rightValuation) {
        return leftValuation - rightValuation;
      }
      const leftResidue = left.unitResidue ?? Number.POSITIVE_INFINITY;
      const rightResidue = right.unitResidue ?? Number.POSITIVE_INFINITY;
      if (leftResidue !== rightResidue) {
        return leftResidue - rightResidue;
      }
      return left.basis.localeCompare(right.basis);
    });

  for (const row of rows) {
    const valuation = Number.isFinite(row.valuation) ? row.valuation : Number.POSITIVE_INFINITY;
    const key = Number.isFinite(valuation) ? String(valuation) : "inf";
    const shell = grouped.get(key) ?? { key, valuation, rows: [] };
    shell.rows.push(row);
    grouped.set(key, shell);
  }

  return [...grouped.values()].sort((left, right) => {
    const leftValue = Number.isFinite(left.valuation) ? left.valuation : Number.POSITIVE_INFINITY;
    const rightValue = Number.isFinite(right.valuation) ? right.valuation : Number.POSITIVE_INFINITY;
    return leftValue - rightValue;
  });
});

const formatScalar = (value: number): string => {
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e4) {
    return value.toExponential(3);
  }
  return value.toFixed(6);
};
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
const shellLabel = (valuation: number): string => (Number.isFinite(valuation) ? `v_p=${formatValuation(valuation)}` : "v_p=+∞");
const residueClassLabel = (residue: number | null): string => (residue === null ? "0" : `u ≡ ${residue} (mod ${props.prime})`);

const handleRowClick = (basis: string) => {
  emit("select-basis", props.selectedBasis === basis ? null : basis);
};

const unitResidueFromRaw = (rawWeight: number, valuation: number): number | null => {
  if (!Number.isFinite(rawWeight) || rawWeight === 0 || !Number.isFinite(valuation)) {
    return null;
  }

  const unit = rawWeight * Math.pow(props.prime, valuation);
  if (!Number.isFinite(unit)) {
    return null;
  }

  const quantized = Math.round(unit * 1_000_000);
  return ((quantized % props.prime) + props.prime) % props.prime;
};
</script>
