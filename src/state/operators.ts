import type { BuiltinGateId, BuiltinSingleGateId, GateId, Operator } from "../types";
import { CNOT, CSWAP, H, I, M, S, SWAP, T, TOFFOLI, X, Y, Z, builtinGateIds } from "../operator";
import type { CustomOperator } from "../types";

export const builtinOperatorMap: Record<BuiltinGateId, Operator> = {
  I,
  X,
  Y,
  Z,
  H,
  S,
  T,
  M,
  CNOT,
  SWAP,
  TOFFOLI,
  CSWAP,
};

export const isBuiltinSingleGate = (gate: string): gate is BuiltinSingleGateId =>
  gate === "I" || gate === "X" || gate === "Y" || gate === "Z" || gate === "H" || gate === "S" || gate === "T" || gate === "M";

export const isBuiltinGate = (gate: string): gate is BuiltinGateId =>
  gate === "I" ||
  gate === "X" ||
  gate === "Y" ||
  gate === "Z" ||
  gate === "H" ||
  gate === "S" ||
  gate === "T" ||
  gate === "M" ||
  gate === "CNOT" ||
  gate === "SWAP" ||
  gate === "TOFFOLI" ||
  gate === "CSWAP";

export type GateKind = "unitary" | "measurement";

const builtinGateKindMap: Record<BuiltinGateId, GateKind> = {
  I: "unitary",
  X: "unitary",
  Y: "unitary",
  Z: "unitary",
  H: "unitary",
  S: "unitary",
  T: "unitary",
  M: "measurement",
  CNOT: "unitary",
  SWAP: "unitary",
  TOFFOLI: "unitary",
  CSWAP: "unitary",
};

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

export const gateKindForGate = (gate: GateId, customOperators: ReadonlyArray<CustomOperator>): GateKind | null => {
  if (isBuiltinGate(gate)) {
    return builtinGateKindMap[gate];
  }

  const custom = customOperators.find((entry) => entry.id === gate);
  return custom ? "unitary" : null;
};

export const availableBuiltinGatesForQubitCount = (qubitCount: number): BuiltinGateId[] =>
  builtinGateIds.filter((gate) => builtinOperatorMap[gate].qubitArity <= qubitCount);
