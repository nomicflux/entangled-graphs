import type { BuiltinGateId, BuiltinSingleGateId, GateId, Operator } from "../types";
import { CNOT, CSWAP, H, I, S, SWAP, T, TOFFOLI, X, Y, Z, builtinGateIds } from "../operator";
import type { CustomOperator } from "../types";

export const builtinOperatorMap: Record<BuiltinGateId, Operator> = {
  I,
  X,
  Y,
  Z,
  H,
  S,
  T,
  CNOT,
  SWAP,
  TOFFOLI,
  CSWAP,
};

export const isBuiltinSingleGate = (gate: string): gate is BuiltinSingleGateId =>
  gate === "I" || gate === "X" || gate === "Y" || gate === "Z" || gate === "H" || gate === "S" || gate === "T";

export const isBuiltinGate = (gate: string): gate is BuiltinGateId =>
  gate === "I" ||
  gate === "X" ||
  gate === "Y" ||
  gate === "Z" ||
  gate === "H" ||
  gate === "S" ||
  gate === "T" ||
  gate === "CNOT" ||
  gate === "SWAP" ||
  gate === "TOFFOLI" ||
  gate === "CSWAP";

export const resolveOperator = (gate: GateId, customOperators: ReadonlyArray<CustomOperator>): Operator | null => {
  if (isBuiltinGate(gate)) {
    return builtinOperatorMap[gate];
  }

  return customOperators.find((entry) => entry.id === gate) ?? null;
};

export const operatorArityForGate = (gate: GateId, customOperators: ReadonlyArray<CustomOperator>): number | null => {
  const operator = resolveOperator(gate, customOperators);
  return operator ? operator.qubitArity : null;
};

export const availableBuiltinGatesForQubitCount = (qubitCount: number): BuiltinGateId[] =>
  builtinGateIds.filter((gate) => builtinOperatorMap[gate].qubitArity <= qubitCount);
