<template>
  <div v-if="open" class="custom-modal-backdrop" @click.self="$emit('close')">
    <section class="custom-modal">
      <h3>Create Custom Multi-Qubit Gate</h3>
      <p class="custom-modal-note">
        Choose a qubit arity, then build a 2x2 block matrix from lower-arity gates. Current scope supports 2-qubit
        builders from single-qubit blocks.
      </p>

      <label class="custom-label">
        Operator label
        <input v-model="label" type="text" placeholder="U2" />
      </label>

      <label class="custom-label">
        Qubit arity
        <select v-model.number="arity">
          <option :value="2">2 qubits (4x4 matrix)</option>
        </select>
      </label>

      <div class="matrix-help">
        <span>U = [[A, B], [C, D]]</span>
        <span>Each block is a 1-qubit gate.</span>
      </div>

      <div class="block-operator-grid">
        <label class="block-cell">
          <span>A (top-left)</span>
          <select v-model="draft.topLeft">
            <optgroup v-for="group in groups" :key="`A-${group.label}`" :label="group.label">
              <option v-for="option in group.options" :key="`A-${option.gate}`" :value="option.gate">
                {{ option.label }}
              </option>
            </optgroup>
          </select>
        </label>
        <label class="block-cell">
          <span>B (top-right)</span>
          <select v-model="draft.topRight">
            <optgroup v-for="group in groups" :key="`B-${group.label}`" :label="group.label">
              <option v-for="option in group.options" :key="`B-${option.gate}`" :value="option.gate">
                {{ option.label }}
              </option>
            </optgroup>
          </select>
        </label>
        <label class="block-cell">
          <span>C (bottom-left)</span>
          <select v-model="draft.bottomLeft">
            <optgroup v-for="group in groups" :key="`C-${group.label}`" :label="group.label">
              <option v-for="option in group.options" :key="`C-${option.gate}`" :value="option.gate">
                {{ option.label }}
              </option>
            </optgroup>
          </select>
        </label>
        <label class="block-cell">
          <span>D (bottom-right)</span>
          <select v-model="draft.bottomRight">
            <optgroup v-for="group in groups" :key="`D-${group.label}`" :label="group.label">
              <option v-for="option in group.options" :key="`D-${option.gate}`" :value="option.gate">
                {{ option.label }}
              </option>
            </optgroup>
          </select>
        </label>
      </div>

      <p v-if="error" class="custom-modal-error">{{ error }}</p>

      <div class="custom-modal-actions">
        <button type="button" class="column-btn" @click="$emit('close')">Cancel</button>
        <button type="button" class="column-btn primary" :disabled="options.length === 0" @click="submit">
          Save NQ Gate
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { BuilderBlockId, SingleQubitBuilderOption } from "../../state/custom-operator-builder";

const props = defineProps<{
  open: boolean;
  options: SingleQubitBuilderOption[];
  error: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", payload: { label: string; arity: 2; selection: { topLeft: BuilderBlockId; topRight: BuilderBlockId; bottomLeft: BuilderBlockId; bottomRight: BuilderBlockId } }): void;
}>();

const label = ref("");
const arity = ref<2>(2);
const draft = reactive({
  topLeft: "I" as BuilderBlockId,
  topRight: "X" as BuilderBlockId,
  bottomLeft: "X" as BuilderBlockId,
  bottomRight: "I" as BuilderBlockId,
});

const groups = computed(() => [
  {
    label: "Built-in 1Q gates",
    options: props.options.filter((option) => option.category === "builtin"),
  },
  {
    label: "Custom 1Q gates",
    options: props.options.filter((option) => option.category === "custom"),
  },
  {
    label: "Non-unitary blocks",
    options: props.options.filter((option) => option.category === "block"),
  },
]);

const synchronizeDraft = () => {
  const availableIds = new Set(props.options.map((option) => option.gate));
  const fallback = props.options[0]?.gate ?? "I";

  if (!availableIds.has(draft.topLeft)) {
    draft.topLeft = fallback;
  }
  if (!availableIds.has(draft.topRight)) {
    draft.topRight = fallback;
  }
  if (!availableIds.has(draft.bottomLeft)) {
    draft.bottomLeft = fallback;
  }
  if (!availableIds.has(draft.bottomRight)) {
    draft.bottomRight = fallback;
  }
};

const reset = () => {
  label.value = "";
  arity.value = 2;
  synchronizeDraft();
};

watch(
  () => props.open,
  (open) => {
    if (open) {
      reset();
    }
  },
);

watch(
  () => props.options,
  () => {
    synchronizeDraft();
  },
  { deep: true },
);

const submit = () => {
  emit("save", {
    label: label.value,
    arity: arity.value,
    selection: {
      topLeft: draft.topLeft,
      topRight: draft.topRight,
      bottomLeft: draft.bottomLeft,
      bottomRight: draft.bottomRight,
    },
  });
};
</script>
