<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Statistical Outputs omega_i</h2>
      <p>Primary columns are omega_i, v_p, |.|_p, unit class, and base-p digits. w_norm is derived.</p>
    </div>

    <p v-if="faithfulErrors.length > 0" class="padic-error">Resolve rho and SOVM validity to compute pairings.</p>
    <div v-else class="padic-output-wrap">
      <table class="padic-output-table">
        <thead>
          <tr>
            <th>Outcome</th>
            <th>omega_i</th>
            <th>v_p</th>
            <th>|.|_p</th>
            <th>unit class</th>
            <th>digits (base p)</th>
            <th>w_norm (Derived)</th>
          </tr>
        </thead>
        <tbody v-for="shell in faithfulOutcomeShells" :key="shell.key">
          <tr class="padic-shell-heading">
            <th colspan="7">valuation shell {{ shellLabel(shell.valuation) }} • {{ shell.rows.length }} outcomes</th>
          </tr>
          <tr
            v-for="row in shell.rows"
            :key="row.id"
            class="padic-output-row"
            :class="{ selected: selectedId === row.id }"
            @click="setFaithfulSelectedOutcome(selectedId === row.id ? null : row.id)"
          >
            <td>{{ row.label }} (basis: {{ row.basis }})</td>
            <td>{{ faithfulDisplay.formatScalar(row.w_raw) }}</td>
            <td>{{ faithfulDisplay.formatValuation(row.v_p) }}</td>
            <td>{{ faithfulDisplay.formatScalar(row.abs_p) }}</td>
            <td>{{ residueClassLabel(row.unitResidue) }}</td>
            <td>{{ row.digits.text }}</td>
            <td>{{ faithfulDisplay.formatScalar(row.w_norm) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  faithfulDisplay,
  faithfulErrors,
  faithfulOutcomeShells,
  pAdicFaithfulState,
  setFaithfulSelectedOutcome,
} from "../../padic-faithful";

const selectedId = computed(() => pAdicFaithfulState.selectedOutcomeId);

const shellLabel = (valuation: number): string =>
  Number.isFinite(valuation) ? `v_p=${faithfulDisplay.formatValuation(valuation)}` : "v_p=+∞";

const residueClassLabel = (residue: number | null): string =>
  residue === null ? "0" : `u ≡ ${residue} (mod ${pAdicFaithfulState.prime})`;
</script>
