<template>
  <section class="panel padic-stage-cards">
    <div class="panel-header">
      <h2>Circuit Stages</h2>
      <p>Stage glyphs render full operator entries rho[i,j] in p-adic coordinates (fractal first, valuation-ring optional).</p>
    </div>

    <div class="padic-faithful-controls">
      <label class="qubit-count-field geometry-mode-field">
        Stage view
        <select :value="pAdicFaithfulState.viewMode" @change="handleModeChange">
          <option value="digit_vector">digit_vector (fractal)</option>
          <option value="valuation_ring">valuation_ring</option>
        </select>
      </label>
    </div>

    <div v-if="faithfulStageViews.length > 0" class="snapshot-grid">
      <button
        v-for="stage in faithfulStageViews"
        :key="stage.id"
        type="button"
        class="snapshot-card"
        :class="{ selected: selectedStageIndex === stage.index }"
        @click="selectStage(stage.index)"
      >
        <p class="snapshot-title">{{ stage.label }}</p>
        <p class="snapshot-hint">{{ stageSource(stage.columnIndex) }}</p>

        <PAdicNumericGlyph
          :entries="entriesForGlyph(stage.entries)"
          :prime="pAdicFaithfulState.prime"
          :mode="pAdicFaithfulState.viewMode"
          :aria-label="`p-adic stage fractal ${stage.label}`"
        />

        <p class="snapshot-row">
          <span>shells</span>
          <span>{{ stage.shells.length }}</span>
        </p>
        <p class="snapshot-row">
          <span>prefix groups</span>
          <span>{{ prefixGroupCount(stage) }}</span>
        </p>
        <p class="snapshot-row">
          <span>outcomes</span>
          <span>{{ stage.rows.length }}</span>
        </p>
        <p class="snapshot-row">
          <span>non-zero rho[i,j]</span>
          <span>{{ stage.nonZeroEntryCount }}</span>
        </p>
        <p class="snapshot-row">
          <span>off-diagonal nz</span>
          <span>{{ stage.nonZeroOffDiagonalCount }}</span>
        </p>
        <p class="snapshot-row">
          <span>lead</span>
          <span>{{ stage.dominantOutcomeLabel }}</span>
        </p>
        <p class="snapshot-row">
          <span>w_norm (Derived)</span>
          <span>{{ faithfulDisplay.formatScalar(stage.dominantWeight) }}</span>
        </p>
      </button>
    </div>

    <section v-if="selectedStage" class="stage-inspector">
      <div class="stage-inspector-head">
        <h3>Stage Inspector</h3>
        <p>{{ selectedStage.label }}</p>
      </div>
      <p class="stage-inspector-context">
        dimension {{ selectedStage.dimension }} x {{ selectedStage.dimension }} • tr(rho) = {{ faithfulDisplay.formatScalar(selectedStage.trace) }}
      </p>
      <p class="stage-inspector-context">support {{ supportSummaryForStage(selectedStage) }}</p>
      <p class="stage-inspector-context">
        non-zero rho[i,j]: {{ selectedStage.nonZeroEntryCount }} • off-diagonal nz: {{ selectedStage.nonZeroOffDiagonalCount }}
      </p>
      <p class="stage-inspector-context">entry support {{ entrySupportSummaryForStage(selectedStage) }}</p>

      <div class="padic-stage-visual-wrap">
        <PAdicNumericGlyph
          detail
          :entries="entriesForGlyph(selectedStage.entries)"
          :prime="pAdicFaithfulState.prime"
          :mode="pAdicFaithfulState.viewMode"
          aria-label="selected stage p-adic fractal"
        />

        <div class="padic-stage-visual-legend">
          <p v-if="pAdicFaithfulState.viewMode === 'digit_vector'">primary map: digit_vector fractal over full rho[i,j] entries</p>
          <p v-else>primary map: valuation_ring over full rho[i,j] entries</p>
          <p>position: descriptor digits (row/column) plus p-adic entry digits</p>
          <p>node intensity: |rho[i,j]|_p (no filtering)</p>
        </div>
      </div>

      <p class="padic-stage-table-heading">Outcome shell and digit detail</p>
      <div class="padic-output-wrap">
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
          <tbody v-for="shell in selectedStage.shells" :key="shell.key">
            <tr class="padic-shell-heading">
              <th colspan="7">valuation shell {{ shellLabel(shell.valuation) }} • {{ shell.rows.length }} outcomes</th>
            </tr>
            <template v-for="group in shell.prefixGroups" :key="group.key">
              <tr class="padic-prefix-heading">
                <th colspan="7">digit prefix {{ group.prefix }} • {{ residueClassLabel(group.residue) }} • {{ group.rows.length }} outcomes</th>
              </tr>
              <tr v-for="row in group.rows" :key="row.id" class="padic-output-row">
                <td>{{ row.label }} (basis: {{ row.basis }})</td>
                <td>{{ faithfulDisplay.formatScalar(row.w_raw) }}</td>
                <td>{{ faithfulDisplay.formatValuation(row.v_p) }}</td>
                <td>{{ faithfulDisplay.formatScalar(row.abs_p) }}</td>
                <td>{{ residueClassLabel(row.unitResidue) }}</td>
                <td>{{ row.digits.text }}</td>
                <td>{{ faithfulDisplay.formatScalar(row.w_norm) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <p class="padic-stage-table-heading">Operator entry detail (full rho)</p>
      <div class="padic-output-wrap">
        <table class="padic-output-table">
          <thead>
            <tr>
              <th>Entry</th>
              <th>value</th>
              <th>v_p</th>
              <th>|.|_p</th>
              <th>unit class</th>
              <th>digits (base p)</th>
              <th>w_norm (Derived)</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in operatorEntriesForTable(selectedStage)"
              :key="entry.id"
              class="padic-output-row"
            >
              <td>
                {{ entry.label }}
                <span class="muted"> ({{ entry.basisRow }} / {{ entry.basisColumn }})</span>
              </td>
              <td>{{ entry.value_text }}</td>
              <td>{{ faithfulDisplay.formatValuation(entry.v_p) }}</td>
              <td>{{ faithfulDisplay.formatScalar(entry.abs_p) }}</td>
              <td>{{ residueClassLabel(entry.unitResidue) }}</td>
              <td>{{ entry.digits.text }}</td>
              <td>{{ faithfulDisplay.formatScalar(entry.w_norm) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ul v-if="faithfulErrors.length > 0" class="padic-error-list">
      <li v-for="(entry, index) in faithfulErrors" :key="index">{{ entry }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import type { PAdicOperatorEntryRow, PAdicStageView } from "../../padic-faithful";
import {
  faithfulDisplay,
  faithfulErrors,
  faithfulStageViews,
  pAdicFaithfulState,
  setFaithfulViewMode,
} from "../../padic-faithful";
import PAdicNumericGlyph from "./PAdicNumericGlyph.vue";

const selectedStageIndex = ref(-1);
const previousMaxStageIndex = ref(-1);

watchEffect(() => {
  if (faithfulStageViews.value.length === 0) {
    selectedStageIndex.value = -1;
    previousMaxStageIndex.value = -1;
    return;
  }

  const maxIndex = faithfulStageViews.value[faithfulStageViews.value.length - 1]?.index ?? 0;

  if (selectedStageIndex.value < 0) {
    selectedStageIndex.value = maxIndex;
    previousMaxStageIndex.value = maxIndex;
    return;
  }

  if (selectedStageIndex.value > maxIndex) {
    selectedStageIndex.value = maxIndex;
  }

  if (selectedStageIndex.value === previousMaxStageIndex.value && maxIndex !== previousMaxStageIndex.value) {
    selectedStageIndex.value = maxIndex;
  }

  previousMaxStageIndex.value = maxIndex;
});

const selectedStage = computed(() =>
  faithfulStageViews.value.find((stage) => stage.index === selectedStageIndex.value) ?? faithfulStageViews.value[faithfulStageViews.value.length - 1] ?? null,
);

const selectStage = (index: number): void => {
  selectedStageIndex.value = index;
};

const handleModeChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  setFaithfulViewMode(target.value);
};

const entriesForGlyph = (entries: ReadonlyArray<PAdicOperatorEntryRow>): ReadonlyArray<PAdicOperatorEntryRow> =>
  entries;

const supportSummaryForStage = (stage: PAdicStageView): string => {
  const support = stage.rows
    .filter((row) => row.abs_p > 0)
    .map((row) => row.id);
  return support.length > 0 ? support.join(", ") : "none";
};

const prefixGroupCount = (stage: PAdicStageView): number =>
  stage.shells.reduce((sum, shell) => sum + shell.prefixGroups.length, 0);

const shellLabel = (valuation: number): string =>
  Number.isFinite(valuation) ? `v_p=${faithfulDisplay.formatValuation(valuation)}` : "v_p=+∞";

const residueClassLabel = (residue: number | null): string =>
  residue === null ? "0" : `u ≡ ${residue} (mod ${pAdicFaithfulState.prime})`;

const stageSource = (columnIndex: number | null): string =>
  columnIndex === null ? "prepared inputs" : `after circuit column ${columnIndex + 1}`;

const operatorEntriesForTable = (stage: PAdicStageView): ReadonlyArray<PAdicOperatorEntryRow> =>
  stage.entries;

const entrySupportSummaryForStage = (stage: PAdicStageView): string => {
  const entries = stage.entries
    .filter((entry) => entry.abs_p > 0)
    .map((entry) => `${entry.label}=${entry.value_text}`);
  return entries.length > 0 ? entries.join(", ") : "none";
};
</script>
