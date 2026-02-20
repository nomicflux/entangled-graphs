import { computed, ref, watch } from "vue";
import type { BlochParams, StageView } from "../../../types";
import { bloch_pair_from_ensemble, measurement_distribution_for_ensemble } from "../../../quantum";
import { qubitFromBloch } from "../../../state/qubit-helpers";
import { useAlgorithmEntanglement } from "../shared/useAlgorithmEntanglement";
import { loadBlochParams, saveBlochParams } from "../shared/storage";
import {
  DEUTSCH_ORACLES,
  deutschColumns,
  deutschEnsembleSnapshots,
  deutschExpectedResult,
  deutschInterferenceTimeline,
  deutschOracleClass,
  deutschOracleDescriptor,
  deutschOracleTruthTable,
  deutschSampleResult,
  deutschStageLabels,
} from "./engine";
import { startDeutschGuessRound, submitDeutschGuess } from "./guess-mode";
import type { DeutschDecisionClass, DeutschMode, DeutschOracleId, DeutschSampleResult } from "./model-types";

const DEUTSCH_ORACLE_KEY = "entangled.algorithms.deutsch.oracle";
const DEUTSCH_MODE_KEY = "entangled.algorithms.deutsch.mode";
const DEUTSCH_Q0_KEY = "entangled.algorithms.deutsch.q0";
const DEUTSCH_Q1_KEY = "entangled.algorithms.deutsch.q1";

const loadOracle = (): DeutschOracleId => {
  const raw = window.localStorage.getItem(DEUTSCH_ORACLE_KEY);
  return DEUTSCH_ORACLES.some((entry) => entry.id === raw) ? (raw as DeutschOracleId) : "const-0";
};

const loadMode = (): DeutschMode => (window.localStorage.getItem(DEUTSCH_MODE_KEY) === "guess" ? "guess" : "select");

export const useDeutschModel = () => {
  const oracleId = ref<DeutschOracleId>(loadOracle());
  const mode = ref<DeutschMode>(loadMode());
  const q0Bloch = ref<BlochParams>(loadBlochParams(DEUTSCH_Q0_KEY, { theta: 0, phi: 0 }));
  const q1Bloch = ref<BlochParams>(loadBlochParams(DEUTSCH_Q1_KEY, { theta: 0, phi: 0 }));
  const selectedStageIndex = ref(0);
  const sampled = ref<DeutschSampleResult | null>(null);
  const guessRound = ref(startDeutschGuessRound());

  const activeOracleId = computed<DeutschOracleId>(() => (mode.value === "guess" ? guessRound.value.activeOracle : oracleId.value));

  watch(oracleId, (value) => {
    window.localStorage.setItem(DEUTSCH_ORACLE_KEY, value);
    sampled.value = null;
  });
  watch(mode, (value, previous) => {
    window.localStorage.setItem(DEUTSCH_MODE_KEY, value);
    sampled.value = null;
    if (value === "guess" && previous !== "guess") {
      guessRound.value = startDeutschGuessRound();
    }
  });
  watch(
    q0Bloch,
    (value) => {
      saveBlochParams(DEUTSCH_Q0_KEY, value);
      sampled.value = null;
    },
    { deep: true },
  );
  watch(
    q1Bloch,
    (value) => {
      saveBlochParams(DEUTSCH_Q1_KEY, value);
      sampled.value = null;
    },
    { deep: true },
  );

  const inputs = computed(() => [qubitFromBloch(q0Bloch.value), qubitFromBloch(q1Bloch.value)] as const);

  const labeledColumns = computed(() => {
    const labels = deutschStageLabels.slice(1);
    return deutschColumns().map((column, index) => ({
      id: `deutsch-col-${index}`,
      label: labels[index] ?? `t${index + 1}`,
      gates: column.gates,
    }));
  });

  const ensembleSnapshots = computed(() => deutschEnsembleSnapshots(activeOracleId.value, inputs.value));
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
  const expected = computed(() => deutschExpectedResult(activeOracleId.value, inputs.value));
  const actualOracleClass = computed(() => deutschOracleClass(activeOracleId.value));
  const actualOracleDescriptor = computed(() => deutschOracleDescriptor(activeOracleId.value));
  const shouldHideOracleIdentity = computed(() => mode.value === "guess" && !guessRound.value.revealed);
  const truthRows = computed(() => (shouldHideOracleIdentity.value ? [] : deutschOracleTruthTable(activeOracleId.value)));
  const oracleClass = computed(() => (shouldHideOracleIdentity.value ? null : actualOracleClass.value));
  const revealedOracleLabel = computed(() => (shouldHideOracleIdentity.value ? null : actualOracleDescriptor.value.functionLabel));

  const q0DecisionProbability = computed(() => ({
    constant: expected.value.q0ConstantProbability,
    balanced: expected.value.q0BalancedProbability,
  }));

  const runSample = () => {
    sampled.value = deutschSampleResult(activeOracleId.value, inputs.value);
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
  const shouldHideDecision = computed(() => mode.value === "guess" && !guessRound.value.revealed);
  const interferenceTimeline = computed(() => deutschInterferenceTimeline(activeOracleId.value, inputs.value));
  const selectedInterferenceView = computed(() =>
    interferenceTimeline.value[selectedStageIndex.value] ?? interferenceTimeline.value[0],
  );

  const startGuessRound = () => {
    guessRound.value = startDeutschGuessRound();
    sampled.value = null;
  };

  const submitGuess = (guess: DeutschDecisionClass) => {
    guessRound.value = submitDeutschGuess(guessRound.value, guess);
  };

  const entanglement = useAlgorithmEntanglement({ ensembleSnapshots, rows: [0, 1] });

  return {
    oracleId,
    mode,
    activeOracleId,
    q0Bloch,
    q1Bloch,
    labeledColumns,
    stageViews,
    selectedStageIndex,
    selectedStage,
    expected,
    expectedDecision,
    shouldHideDecision,
    truthRows,
    oracleClass,
    shouldHideOracleIdentity,
    actualOracleClass,
    actualOracleDescriptor,
    revealedOracleLabel,
    q0DecisionProbability,
    sampled,
    runSample,
    setPreset,
    guessRound,
    startGuessRound,
    submitGuess,
    selectedInterferenceView,
    ...entanglement,
  };
};
