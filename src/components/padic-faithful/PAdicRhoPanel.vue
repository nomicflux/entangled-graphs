<template>
  <section class="panel padic-rho-panel">
    <div class="panel-header">
      <h2>State Operator rho</h2>
      <p>n-qubit p-adic statistical operator built from per-qubit preparation and circuit evolution.</p>
    </div>

    <p class="muted padic-input-note">
      This panel shows the live operator summary; canonical dimension is <code>2^n x 2^n</code>.
    </p>

    <div class="padic-faithful-controls">
      <label class="qubit-count-field">
        Prime p
        <select :value="pAdicFaithfulState.prime" @change="handlePrimeChange">
          <option v-for="prime in PADIC_FAITHFUL_PRIMES" :key="prime" :value="prime">{{ prime }}</option>
        </select>
      </label>
    </div>

    <div v-if="faithfulRhoResult.operator" class="padic-selected-detail">
      <p><strong>dimension:</strong> {{ faithfulRhoResult.operator.dimension }} x {{ faithfulRhoResult.operator.dimension }}</p>
      <p><strong>trace:</strong> {{ faithfulDisplay.formatScalar(faithfulRhoResult.operator.trace) }}</p>
      <p><strong>support omega_i:</strong> {{ supportSummary }}</p>
      <p><strong>non-zero entries:</strong> {{ operatorEntrySummary }}</p>
      <p><strong>non-zero off-diagonal:</strong> {{ offDiagonalSummary }}</p>
      <p><strong>diagonal preview:</strong></p>
      <p v-for="entry in diagonalPreview" :key="entry.index">
        {{ entry.label }} -> {{ entry.value }}
      </p>
      <p><strong>off-diagonal preview:</strong></p>
      <p v-if="offDiagonalPreview.length === 0">none</p>
      <p v-for="entry in offDiagonalPreview" :key="entry.label">
        {{ entry.label }} -> {{ entry.value }}
      </p>
    </div>

    <p v-if="faithfulRhoResult.error" class="padic-error">{{ faithfulRhoResult.error }}</p>
    <p v-else class="padic-ok">rho is valid: selfadjoint and trace-one over full n-qubit dimension.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  PADIC_FAITHFUL_PRIMES,
  faithfulDisplay,
  faithfulRhoResult,
  isZeroPAdicScalar,
  pAdicScalarToString,
  pAdicFaithfulState,
  setFaithfulPrime,
} from "../../padic-faithful";

const handlePrimeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  setFaithfulPrime(Number.parseInt(target.value, 10));
};

const diagonalPreview = computed(() => {
  const operator = faithfulRhoResult.value.operator;
  if (!operator) {
    return [];
  }

  return operator.entries
    .map((row, index) => ({
      index,
      label: `rho[${index},${index}]`,
      value: pAdicScalarToString(row[index]),
    }));
});

const operatorEntrySummary = computed(() => {
  const operator = faithfulRhoResult.value.operator;
  if (!operator) {
    return "--";
  }

  let nonZeroCount = 0;
  for (let row = 0; row < operator.dimension; row += 1) {
    for (let column = 0; column < operator.dimension; column += 1) {
      if (!isZeroPAdicScalar(operator.entries[row][column])) {
        nonZeroCount += 1;
      }
    }
  }

  return `${nonZeroCount} / ${operator.dimension * operator.dimension}`;
});

const offDiagonalSummary = computed(() => {
  const operator = faithfulRhoResult.value.operator;
  if (!operator) {
    return "--";
  }

  let nonZeroOffDiagonal = 0;
  for (let row = 0; row < operator.dimension; row += 1) {
    for (let column = 0; column < operator.dimension; column += 1) {
      if (row === column) {
        continue;
      }
      if (!isZeroPAdicScalar(operator.entries[row][column])) {
        nonZeroOffDiagonal += 1;
      }
    }
  }

  return String(nonZeroOffDiagonal);
});

const supportSummary = computed(() => {
  const operator = faithfulRhoResult.value.operator;
  if (!operator) {
    return "--";
  }

  const supported = operator.entries
    .map((row, index) => ({ value: row[index], index }))
    .filter((entry) => !isZeroPAdicScalar(entry.value))
    .map((entry) => `omega_${entry.index}`);

  return supported.length > 0 ? supported.join(", ") : "none";
});

const offDiagonalPreview = computed(() => {
  const operator = faithfulRhoResult.value.operator;
  if (!operator) {
    return [];
  }

  const entries: Array<{ label: string; value: string }> = [];
  for (let row = 0; row < operator.dimension; row += 1) {
    for (let column = 0; column < operator.dimension; column += 1) {
      if (row === column) {
        continue;
      }
      const value = operator.entries[row][column];
      if (isZeroPAdicScalar(value)) {
        continue;
      }
      entries.push({
        label: `rho[${row},${column}]`,
        value: pAdicScalarToString(value),
      });
    }
  }

  return entries;
});
</script>
