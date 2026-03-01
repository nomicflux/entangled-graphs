<template>
  <BlochPairView :pair="visualModel.renderPair" :animated="props.animated" :compact="props.compact" :size="props.size" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StageSnapshot } from "../types";
import { deriveStageVisualModel } from "./circuit/stage-visual-model";
import BlochPairView from "./BlochPairView.vue";

const props = withDefaults(
  defineProps<{
    stage: StageSnapshot;
    animated?: boolean;
    compact?: boolean;
    size?: "sm" | "md";
  }>(),
  {
    animated: true,
    compact: false,
    size: "md",
  },
);

const visualModel = computed(() => deriveStageVisualModel(props.stage));
</script>
