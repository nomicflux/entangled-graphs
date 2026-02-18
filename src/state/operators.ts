import type { BuiltinSingleGateId, Operator } from "../types";
import { H, I, S, X } from "../operator";

export const builtinOperatorMap: Record<BuiltinSingleGateId, Operator<1>> = {
  I,
  X,
  H,
  S,
};

export const isBuiltinSingleGate = (gate: string): gate is BuiltinSingleGateId =>
  gate === "I" || gate === "X" || gate === "H" || gate === "S";
