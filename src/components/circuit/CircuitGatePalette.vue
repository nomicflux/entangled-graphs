<template>
  <div class="gate-palette">
    <section v-for="group in groups" :key="group.arity" class="gate-group">
      <p class="gate-group-title">{{ group.title }}</p>
      <div class="gate-group-chips">
        <button
          v-for="entry in group.entries"
          :key="entry.id"
          class="gate-chip"
          :class="{ selected: selectedGate === entry.id, 'custom-chip': entry.isCustom }"
          :title="entry.isCustom ? `Alt+Click to delete ${entry.label}` : ''"
          type="button"
          :draggable="isPaletteDraggable(entry.id)"
          @click="$emit('chip-click', entry, $event)"
          @dragstart="$emit('palette-dragstart', entry.id, $event)"
          @dragend="$emit('drag-end')"
        >
          {{ entry.label }}
        </button>
      </div>
    </section>

    <section v-if="measurementEntries.length > 0" class="gate-group measurement-group">
      <p class="gate-group-title">Measurement</p>
      <div class="gate-group-chips">
        <button
          v-for="entry in measurementEntries"
          :key="entry.id"
          class="gate-chip measurement-chip"
          :class="{ selected: selectedGate === entry.id }"
          type="button"
          :draggable="isPaletteDraggable(entry.id)"
          @click="$emit('chip-click', entry, $event)"
          @dragstart="$emit('palette-dragstart', entry.id, $event)"
          @dragend="$emit('drag-end')"
        >
          {{ entry.label }}
        </button>
      </div>
    </section>

    <div class="custom-actions">
      <button class="gate-chip custom-new" type="button" @click="$emit('open-single-custom')">Custom (1Q)</button>
      <button class="gate-chip custom-new" type="button" @click="$emit('open-block-custom')">Custom (NQ)</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GateId } from "../../types";
import type { PaletteEntry, PaletteGroup } from "./palette-types";

defineProps<{
  groups: PaletteGroup[];
  measurementEntries: PaletteEntry[];
  selectedGate: GateId | null;
  isPaletteDraggable: (gate: GateId) => boolean;
}>();

defineEmits<{
  (e: "chip-click", entry: PaletteEntry, event: MouseEvent): void;
  (e: "palette-dragstart", gate: GateId, event: DragEvent): void;
  (e: "drag-end"): void;
  (e: "open-single-custom"): void;
  (e: "open-block-custom"): void;
}>();
</script>
