import * as complex from "../complex";
import { makeSingleQubitOperator, type Block2x2 } from "../operator";
import type { BuiltinSingleGateId, Complex, CustomOperator, GateId, Operator } from "../types";
import { resolveOperator } from "./operators";

const builtinSingleGates: readonly BuiltinSingleGateId[] = ["I", "X", "Y", "Z", "H", "S", "T"];

type NonUnitaryBlockId =
  | "BLOCK_ZERO"
  | "BLOCK_PROJ0"
  | "BLOCK_PROJ1"
  | "BLOCK_KET0_BRA1"
  | "BLOCK_KET1_BRA0";

export type BuilderBlockId = GateId | NonUnitaryBlockId;

export type SingleQubitBuilderOption = {
  gate: BuilderBlockId;
  label: string;
  category: "builtin" | "custom" | "block";
};

export type Block2x2Selection = {
  topLeft: BuilderBlockId;
  topRight: BuilderBlockId;
  bottomLeft: BuilderBlockId;
  bottomRight: BuilderBlockId;
};

const singleQubitMatrix = (a00: Complex, a01: Complex, a10: Complex, a11: Complex): readonly [readonly [Complex, Complex], readonly [Complex, Complex]] => [
  [a00, a01],
  [a10, a11],
];

const nonUnitaryBlockMap: Record<NonUnitaryBlockId, Operator<1>> = {
  BLOCK_ZERO: makeSingleQubitOperator(
    "BLOCK_ZERO",
    "0",
    singleQubitMatrix(complex.from_real(0), complex.from_real(0), complex.from_real(0), complex.from_real(0)),
  ),
  BLOCK_PROJ0: makeSingleQubitOperator(
    "BLOCK_PROJ0",
    "|0><0|",
    singleQubitMatrix(complex.from_real(1), complex.from_real(0), complex.from_real(0), complex.from_real(0)),
  ),
  BLOCK_PROJ1: makeSingleQubitOperator(
    "BLOCK_PROJ1",
    "|1><1|",
    singleQubitMatrix(complex.from_real(0), complex.from_real(0), complex.from_real(0), complex.from_real(1)),
  ),
  BLOCK_KET0_BRA1: makeSingleQubitOperator(
    "BLOCK_KET0_BRA1",
    "|0><1|",
    singleQubitMatrix(complex.from_real(0), complex.from_real(1), complex.from_real(0), complex.from_real(0)),
  ),
  BLOCK_KET1_BRA0: makeSingleQubitOperator(
    "BLOCK_KET1_BRA0",
    "|1><0|",
    singleQubitMatrix(complex.from_real(0), complex.from_real(0), complex.from_real(1), complex.from_real(0)),
  ),
};

const nonUnitaryBlockIds = Object.keys(nonUnitaryBlockMap) as NonUnitaryBlockId[];

const isNonUnitaryBlockId = (gate: BuilderBlockId): gate is NonUnitaryBlockId =>
  nonUnitaryBlockIds.includes(gate as NonUnitaryBlockId);

const resolveSingleQubitOperator = (
  gate: BuilderBlockId,
  customOperators: ReadonlyArray<CustomOperator>,
): Operator<1> | null => {
  if (isNonUnitaryBlockId(gate)) {
    return nonUnitaryBlockMap[gate];
  }

  const resolved = resolveOperator(gate, customOperators);
  if (!resolved || resolved.qubitArity !== 1) {
    return null;
  }
  return resolved as Operator<1>;
};

export const singleQubitBuilderOptions = (
  customOperators: ReadonlyArray<CustomOperator>,
): SingleQubitBuilderOption[] => [
  ...builtinSingleGates.map((gate) => ({ gate, label: gate, category: "builtin" as const })),
  ...customOperators
    .filter((entry) => entry.qubitArity === 1)
    .map((entry) => ({ gate: entry.id, label: entry.label, category: "custom" as const })),
  ...nonUnitaryBlockIds.map((gate) => ({
    gate,
    label: nonUnitaryBlockMap[gate].label,
    category: "block" as const,
  })),
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

export const isUnitaryOperator = (operator: Operator, epsilon: number = 1e-6): boolean => {
  const order = operator.matrix.length;

  for (let row = 0; row < order; row += 1) {
    for (let column = 0; column < order; column += 1) {
      let sum = complex.from_real(0);
      for (let pivot = 0; pivot < order; pivot += 1) {
        sum = complex.add(
          sum,
          complex.mult(operator.matrix[row]![pivot]!, complex.conjugate(operator.matrix[column]![pivot]!)),
        );
      }

      const target = row === column ? 1 : 0;
      if (Math.abs(sum.real - target) > epsilon || Math.abs(sum.imag) > epsilon) {
        return false;
      }
    }
  }

  return true;
};
