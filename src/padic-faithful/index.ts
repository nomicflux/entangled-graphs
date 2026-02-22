export * from "./types";
export * from "./config";

export {
  parsePAdicRaw,
  parsePAdicScalarRaw,
} from "./engine/parse";
export {
  addPAdicScalars,
  dividePAdicScalars,
  equalPAdicScalars,
  isZeroPAdicScalar,
  multiplyPAdicScalars,
  pAdicNormExponentOfScalar,
  pAdicScalarFromFraction,
  pAdicScalarToNumber,
  pAdicScalarToString,
  pAdicUnitResidueOfScalar,
  pAdicValuationOfScalar,
  subtractPAdicScalars,
} from "./engine/scalar";
export {
  pAdicNormFromReal,
  pAdicValuationFromReal,
  unitResidueFromReal,
} from "./engine/valuation";
export {
  pAdicDigitsFromScalar,
  pAdicDigitsFromReal,
} from "./engine/digits";
export {
  statisticalOperatorFromRaw,
} from "./engine/operator";
export {
  sovmFromRawEffects,
} from "./engine/sovm";
export {
  outcomeRowsFromPairing,
  sortOutcomeRowsByShell,
} from "./engine/pairing";

export { pAdicFaithfulState } from "./state/store";
export {
  setFaithfulPrime,
  setFaithfulViewMode,
  setFaithfulRhoEntry,
  setFaithfulEffectId,
  setFaithfulEffectLabel,
  setFaithfulEffectEntry,
  addFaithfulEffect,
  removeFaithfulEffect,
  setFaithfulSelectedOutcome,
} from "./state/actions";
export {
  faithfulRhoResult,
  faithfulSovmResult,
  faithfulErrors,
  faithfulOutcomeRows,
  faithfulOutcomeShells,
  faithfulSelectedOutcome,
  faithfulStageCards,
  faithfulDerivedNodes,
  faithfulDisplay,
} from "./state/selectors";
