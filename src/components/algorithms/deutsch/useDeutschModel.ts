import { computed, ref, watch } from "vue";
import type { BlochParams, StageView } from "../../../types";
import { bloch_pair_from_ensemble, measurement_distribution_for_ensemble } from "../../../quantum";
import { qubitFromBloch } from "../../../state/qubit-helpers";
import { useAlgorithmEntanglement } from "../shared/useAlgorithmEntanglement";
import {
  DEUTSCH_ORACLES,
  deutschColumns,
  deutschEnsembleSnapshots,
  deutschExpectedResult,
  deutschOracleClass,
  deutschOracleTruthTable,
  deutschSampleResult,
  deutschStageLabels,
} from "./engine";
import type { DeutschDecisionClass, DeutschOracleId, DeutschSampleResult } from "./model-types";

type DeutschMode = "select" | "guess";

const DEUTSCH_ORACLE_KEY = "entangled.algorithms.deutsch.oracle";
const DEUTSCH_MODE_KEY = "entangled.algorithms.deutsch.mode";
const DEUTSCH_Q0_KEY = "entangled.algorithms.deutsch.q0";
const DEUTSCH_Q1_KEY = "entangled.algorithms.deutsch.q1";

const loadOracle = (): DeutschOracleId => {
  const raw = window.localStorage.getItem(DEUTSCH_ORACLE_KEY);
  return DEUTSCH_ORACLES.some((entry) => entry.id === raw) ? (raw as DeutschOracleId) : "const-0";
};

const loadMode = (): DeutschMode => (window.localStorage.getItem(DEUTSCH_MODE_KEY) === "guess" ? "guess" : "select");

const loadBloch = (key: string, fallback: BlochParams): BlochParams => {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BlochParams>;
    if (typeof parsed.theta !== "number" || typeof parsed.phi !== "number") {
      return fallback;
    }
    return { theta: parsed.theta, phi: parsed.phi };
  } catch {
    return fallback;
  }
};

export const useDeutschModel = () => {
  const oracleId = ref<DeutschOracleId>(loadOracle());
  const mode = ref<DeutschMode>(loadMode());
  const q0Bloch = ref<BlochParams>(loadBloch(DEUTSCH_Q0_KEY, { theta: 0, phi: 0 }));
  const q1Bloch = ref<BlochParams>(loadBloch(DEUTSCH_Q1_KEY, { theta: 0, phi: 0 }));
  const selectedStageIndex = ref(0);
  const sampled = ref<DeutschSampleResult | null>(null);

  watch(oracleId, (value) => {
    window.localStorage.setItem(DEUTSCH_ORACLE_KEY, value);
    sampled.value = null;
  });
  watch(mode, (value) => window.localStorage.setItem(DEUTSCH_MODE_KEY, value));
  watch(q0Bloch, (value) => window.localStorage.setItem(DEUTSCH_Q0_KEY, JSON.stringify(value)), { deep: true });
  watch(q1Bloch, (value) => window.localStorage.setItem(DEUTSCH_Q1_KEY, JSON.stringify(value)), { deep: true });

  const inputs = computed(() => [qubitFromBloch(q0Bloch.value), qubitFromBloch(q1Bloch.value)] as const);

  const labeledColumns = computed(() => {
    const labels = deutschStageLabels.slice(1);
    return deutschColumns().map((column, index) => ({
      id: `deutsch-col-${index}`,
      label: labels[index] ?? `t${index + 1}`,
      gates: column.gates,
    }));
  });

  const ensembleSnapshots = computed(() => deutschEnsembleSnapshots(oracleId.value, inputs.value));
  const stageViews = computed<StageView[]>(() => {
    const lastIndex = ensembleSnapshots.value.length - 1;
    return ensembleSnapshots.value.map((snapshot, index) => ({
      id: index === 0 ? "deutsch-prepared" : `deutsch-t${index}`,
      index,
      label: deutschStageLabels[index] ?? `t${index}`,
      distribution: measurement_distribution_for_ensemble(snapshot),
      blochPair: bloch_pair_from_ensemble(snapshot),
      isFinal: index === lastIndex,
    }));
  });

  watch(stageViews, (views) => {
    const maxIndex = Math.max(0, views.length - 1);
    if (selectedStageIndex.value > maxIndex) {
      selectedStageIndex.value = maxIndex;
    }
  });

  const selectedStage = computed(() => stageViews.value[selectedStageIndex.value] ?? stageViews.value[0]!);
  const expected = computed(() => deutschExpectedResult(oracleId.value, inputs.value));
  const truthRows = computed(() => deutschOracleTruthTable(oracleId.value));
  const oracleClass = computed(() => deutschOracleClass(oracleId.value));

  const q0DecisionProbability = computed(() => ({
    constant: expected.value.q0ConstantProbability,
    balanced: expected.value.q0BalancedProbability,
  }));

  const runSample = () => {
    sampled.value = deutschSampleResult(oracleId.value, inputs.value);
  };

  const setPreset = (wire: 0 | 1, preset: "zero" | "one" | "half") => {
    const target = wire === 0 ? q0Bloch.value : q1Bloch.value;
    if (preset === "zero") {
      target.theta = 0;
      target.phi = 0;
      return;
    }
    if (preset === "one") {
      target.theta = Math.PI;
      target.phi = 0;
      return;
    }
    target.theta = Math.PI / 2;
    target.phi = 0;
  };

  const expectedDecision = computed<DeutschDecisionClass>(() => expected.value.predictedDecision);

  const entanglement = useAlgorithmEntanglement({ ensembleSnapshots, rows: [0, 1] });

  return {
    oracleId,
    mode,
    q0Bloch,
    q1Bloch,
    labeledColumns,
    stageViews,
    selectedStageIndex,
    selectedStage,
    expected,
    expectedDecision,
    truthRows,
    oracleClass,
    q0DecisionProbability,
    sampled,
    runSample,
    setPreset,
    ...entanglement,
  };
};
