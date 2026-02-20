import type { GateId, QubitRow } from "../../types";

export type DragSource = {
  col: number;
  row: QubitRow;
};

export type DragPayload = {
  gate: GateId;
  from?: DragSource;
};

export type PendingCnotPlacement = {
  kind: "cnot";
  column: number;
  control: QubitRow;
  hoverRow: QubitRow | null;
};

export type PendingToffoliPlacement = {
  kind: "toffoli";
  column: number;
  controlA: QubitRow;
  controlB: QubitRow | null;
  hoverRow: QubitRow | null;
};

export type PendingMultiPlacement = {
  kind: "multi";
  column: number;
  gate: GateId;
  arity: number;
  wires: QubitRow[];
  hoverRow: QubitRow | null;
};

export type PendingPlacement = PendingCnotPlacement | PendingToffoliPlacement | PendingMultiPlacement;

export type ConnectorSegment = {
  id: string;
  kind: "cnot" | "toffoli" | "multi";
  fromRow: number;
  toRow: number;
  preview: boolean;
};

export type MultipartiteBand = {
  id: string;
  rows: ReadonlyArray<QubitRow>;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  strength: number;
};
