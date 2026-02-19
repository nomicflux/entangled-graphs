<template>
  <div v-if="open" class="custom-modal-backdrop" @click.self="$emit('close')">
    <section class="custom-modal">
      <h3>Create Custom Single-Qubit Gate</h3>
      <p class="custom-modal-note">
        Define a 2x2 complex matrix U. Each entry is a complex number (real + imaginary i). Values are normalized on
        submit.
      </p>

      <label class="custom-label">
        Operator label
        <input v-model="label" type="text" placeholder="U" />
      </label>

      <div class="matrix-help">
        <span>Row 0: [U[0,0] U[0,1]]</span>
        <span>Row 1: [U[1,0] U[1,1]]</span>
      </div>

      <div class="operator-grid">
        <div class="operator-cell">
          <p>U[0,0] (Row 0, Column 0)</p>
          <div class="operator-inputs">
            <label>
              Real part
              <input v-model="draft.o00r" type="text" placeholder="e.g. 0.7071" />
            </label>
            <label>
              Imaginary part
              <input v-model="draft.o00i" type="text" placeholder="e.g. 0" />
            </label>
          </div>
        </div>
        <div class="operator-cell">
          <p>U[0,1] (Row 0, Column 1)</p>
          <div class="operator-inputs">
            <label>
              Real part
              <input v-model="draft.o01r" type="text" placeholder="e.g. 0" />
            </label>
            <label>
              Imaginary part
              <input v-model="draft.o01i" type="text" placeholder="e.g. -0.7071" />
            </label>
          </div>
        </div>
        <div class="operator-cell">
          <p>U[1,0] (Row 1, Column 0)</p>
          <div class="operator-inputs">
            <label>
              Real part
              <input v-model="draft.o10r" type="text" placeholder="e.g. 0" />
            </label>
            <label>
              Imaginary part
              <input v-model="draft.o10i" type="text" placeholder="e.g. 0.7071" />
            </label>
          </div>
        </div>
        <div class="operator-cell">
          <p>U[1,1] (Row 1, Column 1)</p>
          <div class="operator-inputs">
            <label>
              Real part
              <input v-model="draft.o11r" type="text" placeholder="e.g. 0.7071" />
            </label>
            <label>
              Imaginary part
              <input v-model="draft.o11i" type="text" placeholder="e.g. 0" />
            </label>
          </div>
        </div>
      </div>

      <div class="custom-modal-actions">
        <button type="button" class="column-btn" @click="$emit('close')">Cancel</button>
        <button type="button" class="column-btn primary" @click="submit">Save 1Q Gate</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import * as complex from "../../complex";
import { singleQubitMatrix, type SingleQubitMatrixEntries } from "../../operator";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", payload: { label: string; entries: SingleQubitMatrixEntries }): void;
}>();

const label = ref("");
const draft = reactive({
  o00r: "1",
  o00i: "0",
  o01r: "0",
  o01i: "0",
  o10r: "0",
  o10i: "0",
  o11r: "1",
  o11i: "0",
});

const reset = () => {
  label.value = "";
  draft.o00r = "1";
  draft.o00i = "0";
  draft.o01r = "0";
  draft.o01i = "0";
  draft.o10r = "0";
  draft.o10i = "0";
  draft.o11r = "1";
  draft.o11i = "0";
};

watch(
  () => props.open,
  (open) => {
    if (open) {
      reset();
    }
  },
);

const parseNumber = (input: string): number => {
  const parsed = Number.parseFloat(input);
  return Number.isFinite(parsed) ? parsed : 0;
};

const submit = () => {
  const entries = singleQubitMatrix(
    complex.complex(parseNumber(draft.o00r), parseNumber(draft.o00i)),
    complex.complex(parseNumber(draft.o01r), parseNumber(draft.o01i)),
    complex.complex(parseNumber(draft.o10r), parseNumber(draft.o10i)),
    complex.complex(parseNumber(draft.o11r), parseNumber(draft.o11i)),
  );
  emit("save", { label: label.value, entries });
};
</script>
