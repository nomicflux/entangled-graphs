<template>
  <section class="panel">
    <div class="panel-header">
      <h2>State Operator rho</h2>
      <p>Canonical state object is a 2x2 p-adic statistical operator with trace one.</p>
    </div>

    <div class="padic-faithful-controls">
      <label class="qubit-count-field">
        Prime p
        <select :value="pAdicFaithfulState.prime" @change="handlePrimeChange">
          <option v-for="prime in PADIC_FAITHFUL_PRIMES" :key="prime" :value="prime">{{ prime }}</option>
        </select>
      </label>
    </div>

    <div class="padic-matrix-wrap">
      <table class="padic-matrix-table">
        <tbody>
          <tr v-for="row in matrixIndex" :key="`rho-row-${row}`">
            <td v-for="column in matrixIndex" :key="`rho-${row}-${column}`">
              <label>
                rho[{{ row }},{{ column }}]
                <input
                  :value="pAdicFaithfulState.rhoRows[row][column]"
                  type="text"
                  @input="setRho(row, column, $event)"
                />
              </label>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="faithfulRhoResult.error" class="padic-error">{{ faithfulRhoResult.error }}</p>
    <p v-else class="padic-ok">rho is valid: selfadjoint and trace-one.</p>
  </section>
</template>

<script setup lang="ts">
import {
  PADIC_FAITHFUL_PRIMES,
  faithfulRhoResult,
  pAdicFaithfulState,
  setFaithfulPrime,
  setFaithfulRhoEntry,
} from "../../padic-faithful";

const matrixIndex: ReadonlyArray<0 | 1> = [0, 1];

const handlePrimeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  setFaithfulPrime(Number.parseInt(target.value, 10));
};

const setRho = (row: 0 | 1, column: 0 | 1, event: Event) => {
  const target = event.target as HTMLInputElement;
  setFaithfulRhoEntry(row, column, target.value);
};
</script>
