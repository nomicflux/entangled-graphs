import type { SingleGateRef } from "../types";
import { state } from "./store";
import { operatorArityForGate } from "./operators";

declare const columnIndexBrand: unique symbol;
declare const wireIndexBrand: unique symbol;
declare const cellRefBrand: unique symbol;
declare const cnotPlacementBrand: unique symbol;
declare const toffoliPlacementBrand: unique symbol;
declare const singlePlacementBrand: unique symbol;

export type ColumnIndex = number & { readonly [columnIndexBrand]: "ColumnIndex" };
export type WireIndex = number & { readonly [wireIndexBrand]: "WireIndex" };

export type CellRef = {
  readonly column: ColumnIndex;
  readonly wire: WireIndex;
  readonly [cellRefBrand]: "CellRef";
};

export type CnotPlacement = {
  readonly column: ColumnIndex;
  readonly control: WireIndex;
  readonly target: WireIndex;
  readonly [cnotPlacementBrand]: "CnotPlacement";
};

export type ToffoliPlacement = {
  readonly column: ColumnIndex;
  readonly controlA: WireIndex;
  readonly controlB: WireIndex;
  readonly target: WireIndex;
  readonly [toffoliPlacementBrand]: "ToffoliPlacement";
};

export type SingleGatePlacement = {
  readonly cell: CellRef;
  readonly gate: SingleGateRef;
  readonly [singlePlacementBrand]: "SingleGatePlacement";
};

const asColumnIndex = (value: number): ColumnIndex => value as ColumnIndex;
const asWireIndex = (value: number): WireIndex => value as WireIndex;

const hasColumn = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value < state.columns.length;

const hasWire = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value < state.preparedBloch.length;

export const toCellRef = (column: number, wire: number): CellRef | null => {
  if (!hasColumn(column) || !hasWire(wire)) {
    return null;
  }

  return {
    column: asColumnIndex(column),
    wire: asWireIndex(wire),
  } as CellRef;
};

export const toSingleGatePlacement = (column: number, wire: number, gate: SingleGateRef): SingleGatePlacement | null => {
  const cell = toCellRef(column, wire);
  if (!cell) {
    return null;
  }
  if (operatorArityForGate(gate, state.customOperators) !== 1) {
    return null;
  }

  return {
    cell,
    gate,
  } as SingleGatePlacement;
};

export const toCnotPlacement = (column: number, control: number, target: number): CnotPlacement | null => {
  if (operatorArityForGate("CNOT", state.customOperators) !== 2) {
    return null;
  }
  if (state.preparedBloch.length < 2) {
    return null;
  }
  if (!hasColumn(column) || !hasWire(control) || !hasWire(target) || control === target) {
    return null;
  }

  return {
    column: asColumnIndex(column),
    control: asWireIndex(control),
    target: asWireIndex(target),
  } as CnotPlacement;
};

export const toToffoliPlacement = (
  column: number,
  controlA: number,
  controlB: number,
  target: number,
): ToffoliPlacement | null => {
  if (operatorArityForGate("TOFFOLI", state.customOperators) !== 3) {
    return null;
  }
  if (state.preparedBloch.length < 3) {
    return null;
  }
  if (!hasColumn(column) || !hasWire(controlA) || !hasWire(controlB) || !hasWire(target)) {
    return null;
  }

  if (new Set([controlA, controlB, target]).size !== 3) {
    return null;
  }

  return {
    column: asColumnIndex(column),
    controlA: asWireIndex(controlA),
    controlB: asWireIndex(controlB),
    target: asWireIndex(target),
  } as ToffoliPlacement;
};
