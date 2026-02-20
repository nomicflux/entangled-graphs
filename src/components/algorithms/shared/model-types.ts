import type { GateInstance } from "../../../types";

export type AlgorithmColumn = {
  id: string;
  label: string;
  gates: GateInstance[];
};
