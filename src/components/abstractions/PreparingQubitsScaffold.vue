<template>
  <main class="panels preparing-panels">
    <section class="panel">
      <div class="panel-header">
        <h2>Target Assignment</h2>
        <p>Task: from prepared <strong>|00></strong>, use only X/H in two columns to match each row target.</p>
      </div>

      <div class="prep-task-card">
        <p class="prep-task-title">Current Task</p>
        <p class="prep-task-summary">{{ taskSummary }}</p>
      </div>

      <div class="prep-target-grid">
        <article v-for="row in rows" :key="row" class="prep-target-row">
          <h3>q{{ row }} target</h3>
          <div class="prep-target-buttons">
            <button
              v-for="option in targetOptions"
              :key="`q${row}-${option.id}`"
              class="prep-target-btn"
              :class="{ active: targetIds[row] === option.id }"
              type="button"
              @click="setTargetForRow(row, option.id)"
            >
              {{ option.label }}
            </button>
          </div>
          <details class="prep-target-hint-spoiler">
            <summary>Show hint</summary>
            <p class="prep-target-hint">{{ selectedTargetsByRow[row]?.hint }}</p>
          </details>
        </article>
      </div>

      <div class="prep-readout-grid">
        <article v-for="entry in rowReadouts" :key="entry.row" class="prep-readout-card" :class="{ reached: entry.reached }">
          <h3>q{{ entry.row }}</h3>
          <p>Target {{ entry.targetLabel }} fidelity: <strong>{{ formatPercent(entry.fidelity) }}</strong></p>
          <p>P(|0>)={{ formatPercent(entry.p0) }} • P(|1>)={{ formatPercent(entry.p1) }}</p>
        </article>
      </div>
    </section>

    <section class="panel panel-center">
      <div class="panel-header">
        <h2>Preparation Circuit</h2>
        <p>Prepared state stays fixed at |0>; two editable columns are available for X/H placement.</p>
      </div>

      <div class="circuit-tools">
        <CircuitGatePalette
          :groups="paletteGroups"
          :measurement-entries="measurementEntries"
          :selected-gate="selectedGate"
          :is-palette-draggable="isPaletteDraggable"
          :show-custom-actions="false"
          @chip-click="handlePaletteChipClick"
          @palette-dragstart="startPaletteDrag"
          @drag-end="endDrag"
        />

        <div class="column-controls">
          <span class="prep-columns-lock">Columns: {{ fixedColumnCount }} (fixed)</span>
          <button class="column-btn" type="button" @click="resetEditableColumns">Reset lesson</button>
        </div>
      </div>

      <p v-if="placementHint" class="placement-hint">{{ placementHint }}</p>

      <div class="circuit-shell">
        <div class="circuit-columns">
          <div
            v-for="(column, colIndex) in columns"
            :key="colIndex"
            class="circuit-column"
            :style="{ gridTemplateRows: `repeat(${rows.length}, minmax(56px, 1fr))` }"
          >
            <p class="algorithm-column-label">{{ columnLabels[colIndex] }}</p>

            <svg
              class="column-entanglement"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                v-for="band in multipartiteBandsForColumn(colIndex)"
                :key="`prep-band-${colIndex}-${band.id}`"
                class="entanglement-multipartite-band"
                :x="band.x"
                :y="band.y"
                :width="band.width"
                :height="band.height"
                :rx="band.rx"
                :style="multipartiteBandStyle(band.strength)"
              >
                <title>{{ multipartiteTooltip(band.rows, band.strength) }}</title>
              </rect>
              <path
                v-for="(link, linkIndex) in entanglementLinksForColumn(colIndex)"
                :key="`${colIndex}-${link.fromRow}-${link.toRow}-${linkIndex}`"
                class="entanglement-arc"
                :d="entanglementArcPath(link)"
                :style="entanglementArcStyle(link)"
              >
                <title>{{ pairwiseTooltip(link) }}</title>
              </path>
            </svg>

            <div class="column-connectors">
              <div
                v-for="connector in connectorSegments(column, colIndex)"
                :key="connector.id"
                class="column-connector"
                :class="[connector.kind, { preview: connector.preview }]"
                :style="connectorStyle(connector)"
              ></div>
            </div>

            <div
              v-for="row in rows"
              :key="row"
              class="gate-slot"
              :class="{
                'is-drop-target': isDropTarget(colIndex, row),
                'is-row-locked': isRowLockedAt(colIndex, row),
                'is-core-locked': isCellLockedAt(colIndex, row),
              }"
              :title="slotTitle(colIndex, row)"
              @dragover.prevent="handleDragOver(colIndex, row)"
              @dragleave="handleDragLeave(colIndex, row)"
              @drop.prevent="handleDrop(colIndex, row)"
              @mouseenter="handleSlotHover(colIndex, row)"
              @mousemove="handleSlotHover(colIndex, row)"
              @mouseleave="handleSlotLeave(colIndex, row)"
              @click="handleSlotClick(colIndex, row, $event)"
            >
              <span class="gate-slot-label">q{{ row }}</span>
              <div
                class="gate-token"
                :class="{
                  empty: slotInstance(column, row) === null,
                  draggable: isDraggableToken(column, row, colIndex),
                  'is-drag-source': isDragSource(colIndex, row),
                  'is-cnot-control': isCnotControl(column, row) || isPendingCnotControl(colIndex, row),
                  'is-cnot-target': isCnotTarget(column, row) || isPendingCnotTarget(colIndex, row),
                  'is-toffoli-control': isToffoliControl(column, row) || isPendingToffoliControl(colIndex, row),
                  'is-toffoli-target': isToffoliTarget(column, row) || isPendingToffoliTarget(colIndex, row),
                  'is-multi-custom-wire': isCustomMultiWire(column, row) || isPendingMultiWire(colIndex, row),
                  'is-multi-custom-hover': isPendingMultiHover(colIndex, row),
                  'is-measurement': isMeasurementToken(column, row),
                  'is-row-locked-token': isRowLockedAt(colIndex, row),
                  'is-core-locked-token': isCellLockedAt(colIndex, row),
                }"
                :draggable="isDraggableToken(column, row, colIndex)"
                @dragstart="startCellDrag(colIndex, row, $event)"
                @dragend="endDrag"
              >
                {{ tokenFor(column, row) }}
              </div>
            </div>
          </div>
        </div>

        <div class="circuit-legend">
          <span class="circuit-legend-time">Time -></span>
          <span class="circuit-legend-item">
            <span class="circuit-legend-swatch pairwise"></span>
            <span>Pairwise</span>
          </span>
          <span class="circuit-legend-item">
            <span class="circuit-legend-swatch multipartite"></span>
            <span>Multipartite</span>
          </span>
        </div>
      </div>

      <CircuitStageSnapshots
        :stages="stageViews"
        :selected-stage-index="selectedStageIndex"
        @select-stage="setSelectedStage"
      />

      <StageInspector :stage="selectedStage" :animated="false" />
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Lesson Outcome</h2>
        <p>Success when each qubit meets its assigned target.</p>
      </div>

      <div class="prep-outcome" :class="{ complete: allRowsReady }">
        <p v-if="allRowsReady"><strong>Complete:</strong> every row now matches its own assigned target.</p>
        <p v-else><strong>In progress:</strong> adjust X/H placement until each row target is reached.</p>
      </div>

      <div class="probability-list">
        <h3>Final Distribution</h3>
        <div v-for="entry in finalDistribution" :key="entry.basis" class="prob-row">
          <span>|{{ entry.basis }}></span>
          <div class="prob-bar-wrap">
            <div class="prob-bar" :style="{ width: `${entry.probability * 100}%` }"></div>
          </div>
          <span>{{ formatPercent(entry.probability) }}</span>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import CircuitGatePalette from "../circuit/CircuitGatePalette.vue";
import CircuitStageSnapshots from "../circuit/CircuitStageSnapshots.vue";
import StageInspector from "../StageInspector.vue";
import { usePreparingQubitsModel } from "./preparing-qubits/usePreparingQubitsModel";

const {
  rows,
  columns,
  columnLabels,
  paletteGroups,
  measurementEntries,
  selectedGate,
  selectedStageIndex,
  selectedStage,
  stageViews,
  targetIds,
  targetOptions,
  selectedTargetsByRow,
  taskSummary,
  rowReadouts,
  allRowsReady,
  finalDistribution,
  fixedColumnCount,
  resetEditableColumns,
  setTargetForRow,
  setSelectedStage,
  handlePaletteChipClick,
  placementHint,
  isPaletteDraggable,
  slotInstance,
  tokenFor,
  isDraggableToken,
  isCnotControl,
  isCnotTarget,
  isToffoliControl,
  isToffoliTarget,
  isCustomMultiWire,
  isMeasurementToken,
  isPendingCnotControl,
  isPendingCnotTarget,
  isPendingToffoliControl,
  isPendingToffoliTarget,
  isPendingMultiWire,
  isPendingMultiHover,
  connectorSegments,
  connectorStyle,
  entanglementLinksForColumn,
  multipartiteBandsForColumn,
  entanglementArcPath,
  entanglementArcStyle,
  multipartiteBandStyle,
  pairwiseTooltip,
  multipartiteTooltip,
  startPaletteDrag,
  startCellDrag,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  endDrag,
  handleSlotHover,
  handleSlotLeave,
  handleSlotClick,
  isDropTarget,
  isDragSource,
  isCellLockedAt,
  isRowLockedAt,
  slotTitle,
} = usePreparingQubitsModel();

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;
</script>
