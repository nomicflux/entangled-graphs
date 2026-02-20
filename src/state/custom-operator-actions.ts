import { normalizeOperator, persistCustomOperators } from "./custom-operator-storage";
import { blockMatrix2x2, makeSingleQubitOperator, type Block2x2, type SingleQubitMatrixEntries } from "../operator";
import { state } from "./store";

const nextCustomOperatorId = (): string => `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nextCustomOperatorLabel = (label: string): string =>
  label.trim() === "" ? `U${state.customOperators.length + 1}` : label.trim();

export const createCustomSingleQubitOperator = (label: string, entries: SingleQubitMatrixEntries): string => {
  const id = nextCustomOperatorId();
  const operatorLabel = nextCustomOperatorLabel(label);
  const created = normalizeOperator(makeSingleQubitOperator(id, operatorLabel, entries));

  state.customOperators.push(created);
  persistCustomOperators(state.customOperators);
  return created.id;
};

export const createCustomBlockOperator = (label: string, blocks: Block2x2<1>): string => {
  const id = nextCustomOperatorId();
  const operatorLabel = nextCustomOperatorLabel(label);
  const created = blockMatrix2x2(id, operatorLabel, blocks);

  state.customOperators.push(created);
  persistCustomOperators(state.customOperators);
  return created.id;
};

export const createCustomOperator = createCustomSingleQubitOperator;

export const deleteCustomOperator = (id: string): void => {
  state.customOperators = state.customOperators.filter((entry) => entry.id !== id);

  for (const column of state.columns) {
    column.gates = column.gates.filter((gate) => gate.gate !== id);
  }

  if (state.selectedGate === id) {
    state.selectedGate = null;
  }

  persistCustomOperators(state.customOperators);
};
