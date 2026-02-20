import type { DeutschDecisionClass, DeutschGuessState, DeutschOracleId } from "./model-types";
import { deutschOracleClass } from "./engine";

const ORACLE_IDS: readonly DeutschOracleId[] = ["const-0", "const-1", "balanced-id", "balanced-not"];

export const randomDeutschOracleId = (random: () => number = Math.random): DeutschOracleId => {
  const index = Math.floor(random() * ORACLE_IDS.length);
  return ORACLE_IDS[Math.min(Math.max(index, 0), ORACLE_IDS.length - 1)]!;
};

export const startDeutschGuessRound = (
  random: () => number = Math.random,
  oracleOverride?: DeutschOracleId,
): DeutschGuessState => ({
  activeOracle: oracleOverride ?? randomDeutschOracleId(random),
  guess: null,
  revealed: false,
  correct: null,
});

export const submitDeutschGuess = (
  round: DeutschGuessState,
  guess: DeutschDecisionClass,
): DeutschGuessState => ({
  activeOracle: round.activeOracle,
  guess,
  revealed: true,
  correct: guess === deutschOracleClass(round.activeOracle),
});
