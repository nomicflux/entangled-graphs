import type {
  PAdicCircuitGate,
  PAdicInputPreset,
  PAdicOperatorEntryRow,
  PAdicOutcomeRow,
  PAdicPrime,
  PAdicStatisticalOperator,
} from "../types";
import { pAdicDigitsFromScalar } from "./digits";
import { parseRawMatrix2 } from "./operator";
import { clonePresetRowsForInput } from "./prep";
import {
  addPAdicScalars,
  equalPAdicScalars,
  isZeroPAdicScalar,
  multiplyPAdicScalars,
  pAdicNormExponentOfScalar,
  pAdicScalarFromFraction,
  pAdicScalarToNumber,
  pAdicScalarToString,
  pAdicUnitResidueOfScalar,
  pAdicValuationOfScalar,
  type PAdicScalar,
} from "./scalar";
import { matrixTensorProduct, matrixTrace } from "./matrix";

const basis0Sign = pAdicScalarFromFraction(1);
const basis1Sign = pAdicScalarFromFraction(-1);
const zeroScalar = pAdicScalarFromFraction(0);

const zeroSquareMatrix = (dimension: number): PAdicScalar[][] =>
  Array.from({ length: dimension }, () =>
    Array.from({ length: dimension }, () => zeroScalar),
  );

const normFromScalar = (value: PAdicScalar, prime: number): number => {
  if (isZeroPAdicScalar(value)) {
    return 0;
  }
  const exponent = pAdicNormExponentOfScalar(value, prime);
  if (!Number.isFinite(exponent)) {
    return 0;
  }
  return Math.pow(prime, exponent);
};

const localMatrixFromPreset = (preset: PAdicInputPreset, prime: number): PAdicScalar[][] =>
  parseRawMatrix2(clonePresetRowsForInput(preset), prime);

const tensorProductState = (preparedInputs: ReadonlyArray<{ preset: PAdicInputPreset }>, prime: number): PAdicScalar[][] => {
  const localInputs =
    preparedInputs.length > 0
      ? preparedInputs
      : [{ preset: "basis_0" as const }];

  let state = localMatrixFromPreset(localInputs[0].preset, prime);
  for (let index = 1; index < localInputs.length; index += 1) {
    state = matrixTensorProduct(state, localMatrixFromPreset(localInputs[index].preset, prime));
  }
  return state;
};

const bitMaskForQubit = (qubitIndex: number, qubitCount: number): number =>
  1 << (qubitCount - qubitIndex - 1);

const applyColumnToDensity = (
  rho: PAdicScalar[][],
  gates: ReadonlyArray<PAdicCircuitGate>,
  qubitCount: number,
): PAdicScalar[][] => {
  const dimension = rho.length;
  const xMask = gates.reduce((mask, gate, rowIndex) =>
    gate === "X" ? (mask | bitMaskForQubit(rowIndex, qubitCount)) : mask, 0);
  const zMask = gates.reduce((mask, gate, rowIndex) =>
    gate === "Z" ? (mask | bitMaskForQubit(rowIndex, qubitCount)) : mask, 0);
  const mMask = gates.reduce((mask, gate, rowIndex) =>
    gate === "M" ? (mask | bitMaskForQubit(rowIndex, qubitCount)) : mask, 0);

  const out = zeroSquareMatrix(dimension);

  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      if (mMask !== 0 && (((row ^ column) & mMask) !== 0)) {
        out[row][column] = zeroScalar;
        continue;
      }

      const sourceRow = row ^ xMask;
      const sourceColumn = column ^ xMask;
      let value = rho[sourceRow][sourceColumn];

      if (zMask !== 0) {
        const rowParity = ((row & zMask).toString(2).match(/1/g) ?? []).length % 2;
        const columnParity = ((column & zMask).toString(2).match(/1/g) ?? []).length % 2;
        const rowSign = rowParity === 0 ? basis0Sign : basis1Sign;
        const columnSign = columnParity === 0 ? basis0Sign : basis1Sign;
        value = multiplyPAdicScalars(value, multiplyPAdicScalars(rowSign, columnSign));
      }

      out[row][column] = value;
    }
  }

  return out;
};

const traceOneScalar = pAdicScalarFromFraction(1);

type CircuitStageOperator = {
  id: string;
  index: number;
  label: string;
  columnIndex: number | null;
  operator: PAdicStatisticalOperator;
};

const operatorFromEntries = (entries: PAdicScalar[][]): { operator: PAdicStatisticalOperator | null; error: string | null } => {
  const traceScalar = matrixTrace(entries);
  if (!equalPAdicScalars(traceScalar, traceOneScalar)) {
    return {
      operator: null,
      error: "rho must have trace one.",
    };
  }

  return {
    operator: {
      entries,
      dimension: entries.length,
      traceScalar,
      trace: pAdicScalarToNumber(traceScalar),
    },
    error: null,
  };
};

export const stageOperatorsFromPreparedInputsAndCircuit = (
  preparedInputs: ReadonlyArray<{ preset: PAdicInputPreset }>,
  columns: ReadonlyArray<{ gates: PAdicCircuitGate[] }>,
  qubitCount: number,
  prime: PAdicPrime,
): { stages: ReadonlyArray<CircuitStageOperator>; error: string | null } => {
  if (qubitCount < 1) {
    return {
      stages: [],
      error: "qubit count must be at least 1.",
    };
  }

  let rho = tensorProductState(preparedInputs.slice(0, qubitCount), prime);
  const initial = operatorFromEntries(rho);
  if (!initial.operator) {
    return {
      stages: [],
      error: initial.error,
    };
  }

  const stages: CircuitStageOperator[] = [
    {
      id: "stage_0",
      index: 0,
      label: "Input",
      columnIndex: null,
      operator: initial.operator,
    },
  ];

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const gates = Array.from({ length: qubitCount }, (_, index) => columns[columnIndex]?.gates[index] ?? null);
    rho = applyColumnToDensity(rho, gates, qubitCount);
    const stage = operatorFromEntries(rho);
    if (!stage.operator) {
      return {
        stages: [],
        error: stage.error,
      };
    }

    stages.push({
      id: `stage_${columnIndex + 1}`,
      index: columnIndex + 1,
      label: `After C${columnIndex + 1}`,
      columnIndex,
      operator: stage.operator,
    });
  }

  return {
    stages,
    error: null,
  };
};

export const stateOperatorFromPreparedInputsAndCircuit = (
  preparedInputs: ReadonlyArray<{ preset: PAdicInputPreset }>,
  columns: ReadonlyArray<{ gates: PAdicCircuitGate[] }>,
  qubitCount: number,
  prime: PAdicPrime,
): { operator: PAdicStatisticalOperator | null; error: string | null } => {
  const staged = stageOperatorsFromPreparedInputsAndCircuit(preparedInputs, columns, qubitCount, prime);
  if (staged.error) {
    return {
      operator: null,
      error: staged.error,
    };
  }

  const finalStage = staged.stages[staged.stages.length - 1];
  if (!finalStage) {
    return {
      operator: null,
      error: "rho must have trace one.",
    };
  }

  return {
    operator: finalStage.operator,
    error: null,
  };
};

const basisLabelForIndex = (index: number, qubitCount: number): string =>
  `|${index.toString(2).padStart(qubitCount, "0")}>`;

export const outcomeRowsFromDensityDiagonal = (
  operator: PAdicStatisticalOperator,
  qubitCount: number,
  prime: PAdicPrime,
): ReadonlyArray<PAdicOutcomeRow> => {
  const base = operator.entries.map((row, index) => {
    const omegaScalar = row[index];
    const omega = pAdicScalarToNumber(omegaScalar);
    const valuation = pAdicValuationOfScalar(omegaScalar, prime);
    const norm = normFromScalar(omegaScalar, prime);
    const residue = pAdicUnitResidueOfScalar(omegaScalar, prime);
    const digits = pAdicDigitsFromScalar(omegaScalar, prime);

    return {
      id: `omega_${index}`,
      label: basisLabelForIndex(index, qubitCount),
      basis: basisLabelForIndex(index, qubitCount),
      w_raw: omega,
      v_p: valuation,
      abs_p: norm,
      unitResidue: residue,
      digits,
      w_norm: 0,
    } satisfies PAdicOutcomeRow;
  });

  const normTotal = base.reduce((sum, row) => sum + row.abs_p, 0);
  return base.map((row) => ({
    ...row,
    w_norm: normTotal > 0 ? row.abs_p / normTotal : 0,
  }));
};

export const operatorEntryRowsFromOperator = (
  operator: PAdicStatisticalOperator,
  qubitCount: number,
  prime: PAdicPrime,
): ReadonlyArray<PAdicOperatorEntryRow> => {
  const rows: PAdicOperatorEntryRow[] = [];
  for (let row = 0; row < operator.dimension; row += 1) {
    for (let column = 0; column < operator.dimension; column += 1) {
      const scalar = operator.entries[row][column];
      const valuation = pAdicValuationOfScalar(scalar, prime);
      const norm = normFromScalar(scalar, prime);
      rows.push({
        id: `rho_${row}_${column}`,
        label: `rho[${row},${column}]`,
        row,
        column,
        basisRow: basisLabelForIndex(row, qubitCount),
        basisColumn: basisLabelForIndex(column, qubitCount),
        isDiagonal: row === column,
        value_raw: pAdicScalarToNumber(scalar),
        value_text: pAdicScalarToString(scalar),
        v_p: valuation,
        abs_p: norm,
        unitResidue: pAdicUnitResidueOfScalar(scalar, prime),
        digits: pAdicDigitsFromScalar(scalar, prime),
        w_norm: 0,
      });
    }
  }

  const normTotal = rows.reduce((sum, entry) => sum + entry.abs_p, 0);
  return rows.map((entry) => ({
    ...entry,
    w_norm: normTotal > 0 ? entry.abs_p / normTotal : 0,
  }));
};

export const densityDiagonalTrace = (operator: PAdicStatisticalOperator): PAdicScalar =>
  operator.entries.reduce((sum, row, index) => addPAdicScalars(sum, row[index]), pAdicScalarFromFraction(0));
