export { state } from "./store";
export type { CellRef, CnotPlacement, ColumnIndex, SingleGatePlacement, ToffoliPlacement, WireIndex } from "./placements";
export { toCellRef, toCnotPlacement, toSingleGatePlacement, toToffoliPlacement } from "./placements";
export { operatorArityForGate, resolveOperator } from "./operators";

export {
  qubitCount,
  preparedQubits,
  preparedDistribution,
  finalDistribution,
  stageViews,
  selectedStage,
  gateAt,
  gateLabel,
  gateInstanceAt,
} from "./selectors";

export {
  setSelectedGate,
  addQubit,
  removeQubit,
  setQubitCount,
  createCustomOperator,
  deleteCustomOperator,
  setGateAt,
  placeCnot,
  placeToffoli,
  clearGateAt,
  appendColumn,
  removeLastColumn,
  setSelectedStage,
} from "./actions";
