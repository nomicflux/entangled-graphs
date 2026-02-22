<template>
  <section class="panel panel-center padic-sovm-panel">
    <div class="panel-header">
      <h2>SOVM Effects F_i</h2>
      <p>Computational-basis SOVM over the full n-qubit space.</p>
    </div>

    <div class="padic-selected-detail">
      <p><strong>mode:</strong> auto-generated basis projectors</p>
      <p><strong>effect count:</strong> {{ effectCount }}</p>
      <p><strong>identity check:</strong> ΣF_i = I (by construction)</p>
      <p><strong>preview:</strong> {{ previewLabels }}</p>
    </div>

    <p v-if="faithfulSovmResult.error" class="padic-error">{{ faithfulSovmResult.error }}</p>
    <p v-else class="padic-ok">SOVM is valid for the current n-qubit operator.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { faithfulSovmResult, pAdicFaithfulState } from "../../padic-faithful";

const effectCount = computed(() =>
  Math.pow(2, pAdicFaithfulState.qubitCount),
);

const previewLabels = computed(() =>
  Array.from({ length: Math.min(6, effectCount.value) }, (_, index) =>
    `F_${index}`,
  ).join(", "),
);
</script>
