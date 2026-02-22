<template>
  <section class="panel panel-center">
    <div class="panel-header">
      <h2>SOVM Effects F_i</h2>
      <p>Define selfadjoint effects that sum to identity in the faithful operator/SOVM model.</p>
    </div>

    <div class="padic-faithful-controls">
      <button class="column-btn" type="button" @click="addFaithfulEffect">Add effect</button>
    </div>

    <div class="padic-effects-grid">
      <article v-for="(effect, effectIndex) in pAdicFaithfulState.effects" :key="effectIndex" class="padic-effect-card">
        <div class="padic-effect-head">
          <label>
            id
            <input :value="effect.id" type="text" @input="setEffectId(effectIndex, $event)" />
          </label>
          <label>
            label
            <input :value="effect.label" type="text" @input="setEffectLabel(effectIndex, $event)" />
          </label>
          <button class="column-btn" type="button" :disabled="pAdicFaithfulState.effects.length <= 1" @click="removeFaithfulEffect(effectIndex)">
            Remove
          </button>
        </div>

        <table class="padic-matrix-table">
          <tbody>
            <tr v-for="row in matrixIndex" :key="`${effectIndex}-row-${row}`">
              <td v-for="column in matrixIndex" :key="`${effectIndex}-${row}-${column}`">
                <label>
                  F[{{ row }},{{ column }}]
                  <input
                    :value="effect.rows[row][column]"
                    type="text"
                    @input="setEffectEntry(effectIndex, row, column, $event)"
                  />
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>

    <p v-if="faithfulSovmResult.error" class="padic-error">{{ faithfulSovmResult.error }}</p>
    <p v-else class="padic-ok">SOVM is valid: selfadjoint family with ΣF_i = I.</p>
  </section>
</template>

<script setup lang="ts">
import {
  addFaithfulEffect,
  faithfulSovmResult,
  pAdicFaithfulState,
  removeFaithfulEffect,
  setFaithfulEffectEntry,
  setFaithfulEffectId,
  setFaithfulEffectLabel,
} from "../../padic-faithful";

const matrixIndex: ReadonlyArray<0 | 1> = [0, 1];

const setEffectId = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  setFaithfulEffectId(index, target.value);
};

const setEffectLabel = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  setFaithfulEffectLabel(index, target.value);
};

const setEffectEntry = (effectIndex: number, row: 0 | 1, column: 0 | 1, event: Event) => {
  const target = event.target as HTMLInputElement;
  setFaithfulEffectEntry(effectIndex, row, column, target.value);
};
</script>
