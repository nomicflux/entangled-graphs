import type { Block2x2 } from "../operator";
import type { BuiltinSingleGateId, CustomOperator, GateId, Operator } from "../types";
import { resolveOperator } from "./operators";

const builtinSingleGates: readonly BuiltinSingleGateId[] = ["I", "X", "H", "S"];

export type SingleQubitBuilderOption = {
  gate: GateId;
  label: string;
};

export type Block2x2Selection = {
  topLeft: GateId;
  topRight: GateId;
  bottomLeft: GateId;
  bottomRight: GateId;
};

const resolveSingleQubitOperator = (
  gate: GateId,
  customOperators: ReadonlyArray<CustomOperator>,
): Operator<1> | null => {
  const resolved = resolveOperator(gate, customOperators);
  if (!resolved || resolved.qubitArity !== 1) {
    return null;
  }
  return resolved as Operator<1>;
};

export const singleQubitBuilderOptions = (
  customOperators: ReadonlyArray<CustomOperator>,
): SingleQubitBuilderOption[] => [
  ...builtinSingleGates.map((gate) => ({ gate, label: gate })),
  ...customOperators
    .filter((operator) => operator.qubitArity === 1)
    .map((operator) => ({ gate: operator.id, label: operator.label })),
];

export const resolveBlock2x2Selection = (
  selection: Block2x2Selection,
  customOperators: ReadonlyArray<CustomOperator>,
): Block2x2<1> | null => {
  const topLeft = resolveSingleQubitOperator(selection.topLeft, customOperators);
  const topRight = resolveSingleQubitOperator(selection.topRight, customOperators);
  const bottomLeft = resolveSingleQubitOperator(selection.bottomLeft, customOperators);
  const bottomRight = resolveSingleQubitOperator(selection.bottomRight, customOperators);

  if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
    return null;
  }

  return [
    [topLeft, topRight],
    [bottomLeft, bottomRight],
  ];
};
