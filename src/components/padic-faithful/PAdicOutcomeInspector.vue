<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Outcome Inspector</h2>
      <p>Inspect one omega_i record with valuation, unit class, and digits.</p>
    </div>

    <div v-if="faithfulSelectedOutcome" class="padic-selected-detail">
      <p><strong>Selected:</strong> {{ faithfulSelectedOutcome.label }} ({{ faithfulSelectedOutcome.id }})</p>
      <p><strong>basis:</strong> {{ faithfulSelectedOutcome.basis }}</p>
      <p><strong>omega_i / w_raw:</strong> {{ faithfulDisplay.formatScalar(faithfulSelectedOutcome.w_raw) }}</p>
      <p>
        <strong>v_p / |.|_p:</strong>
        {{ faithfulDisplay.formatValuation(faithfulSelectedOutcome.v_p) }} /
        {{ faithfulDisplay.formatScalar(faithfulSelectedOutcome.abs_p) }}
      </p>
      <p><strong>unit class:</strong> {{ residueClassLabel(faithfulSelectedOutcome.unitResidue) }}</p>
      <p><strong>base-p digits:</strong> {{ faithfulSelectedOutcome.digits.text }}</p>
      <p><strong>w_norm (Derived):</strong> {{ faithfulDisplay.formatScalar(faithfulSelectedOutcome.w_norm) }}</p>
    </div>

    <p v-else class="muted">Select an outcome row to inspect it.</p>
  </section>
</template>

<script setup lang="ts">
import { faithfulDisplay, faithfulSelectedOutcome, pAdicFaithfulState } from "../../padic-faithful";

const residueClassLabel = (residue: number | null): string =>
  residue === null ? "0" : `u ≡ ${residue} (mod ${pAdicFaithfulState.prime})`;
</script>
