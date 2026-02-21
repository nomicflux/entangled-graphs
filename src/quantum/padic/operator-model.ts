import { p_adic_norm_from_real, p_adic_valuation_from_real } from "./measurement-model";

const MATRIX_EPSILON = 1e-9;

export type PAdicOperatorMatrix = ReadonlyArray<ReadonlyArray<number>>;

export type PAdicOperator = {
  dimension: number;
  entries: PAdicOperatorMatrix;
};

export type PAdicStatisticalOperator = PAdicOperator & {
  kind: "statistical_operator";
};

export type PAdicSovmEffect = {
  id: string;
  label: string;
  operator: PAdicOperator;
};

export type PAdicSovm = {
  dimension: number;
  effects: ReadonlyArray<PAdicSovmEffect>;
};

export type PAdicSovmPairing = {
  id: string;
  label: string;
  omega: number;
  valuation: number;
  norm: number;
};

const cloneRows = (rows: PAdicOperatorMatrix): number[][] => rows.map((row) => row.map((value) => value));

const isSquareRows = (rows: PAdicOperatorMatrix): boolean => {
  const dimension = rows.length;
  if (dimension === 0) {
    return false;
  }

  return rows.every((row) => row.length === dimension && row.every((value) => Number.isFinite(value)));
};

const matrixEquals = (left: PAdicOperatorMatrix, right: PAdicOperatorMatrix, tolerance: number = MATRIX_EPSILON): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  for (let row = 0; row < left.length; row += 1) {
    if (left[row]!.length !== right[row]!.length) {
      return false;
    }

    for (let column = 0; column < left[row]!.length; column += 1) {
      if (Math.abs(left[row]![column]! - right[row]![column]!) > tolerance) {
        return false;
      }
    }
  }

  return true;
};

export const p_adic_operator_from_rows = (rows: PAdicOperatorMatrix): PAdicOperator | null => {
  if (!isSquareRows(rows)) {
    return null;
  }

  return {
    dimension: rows.length,
    entries: cloneRows(rows),
  };
};

export const p_adic_identity_operator = (dimension: number): PAdicOperator | null => {
  if (!Number.isInteger(dimension) || dimension < 1) {
    return null;
  }

  return {
    dimension,
    entries: Array.from({ length: dimension }, (_, row) =>
      Array.from({ length: dimension }, (_, column) => (row === column ? 1 : 0)),
    ),
  };
};

export const p_adic_operator_trace = (operator: PAdicOperator): number => {
  let total = 0;
  for (let index = 0; index < operator.dimension; index += 1) {
    total += operator.entries[index]![index]!;
  }
  return total;
};

export const p_adic_operator_is_selfadjoint = (operator: PAdicOperator, tolerance: number = MATRIX_EPSILON): boolean => {
  for (let row = 0; row < operator.dimension; row += 1) {
    for (let column = row + 1; column < operator.dimension; column += 1) {
      if (Math.abs(operator.entries[row]![column]! - operator.entries[column]![row]!) > tolerance) {
        return false;
      }
    }
  }
  return true;
};

export const p_adic_operator_is_trace_one = (operator: PAdicOperator, tolerance: number = MATRIX_EPSILON): boolean =>
  Math.abs(p_adic_operator_trace(operator) - 1) <= tolerance;

export const p_adic_operator_add = (left: PAdicOperator, right: PAdicOperator): PAdicOperator | null => {
  if (left.dimension !== right.dimension) {
    return null;
  }

  const entries = Array.from({ length: left.dimension }, (_, row) =>
    Array.from({ length: left.dimension }, (_, column) => left.entries[row]![column]! + right.entries[row]![column]!),
  );

  return {
    dimension: left.dimension,
    entries,
  };
};

export const p_adic_operator_product = (left: PAdicOperator, right: PAdicOperator): PAdicOperator | null => {
  if (left.dimension !== right.dimension) {
    return null;
  }

  const dimension = left.dimension;
  const entries = Array.from({ length: dimension }, () => Array.from({ length: dimension }, () => 0));

  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      let value = 0;
      for (let inner = 0; inner < dimension; inner += 1) {
        value += left.entries[row]![inner]! * right.entries[inner]![column]!;
      }
      entries[row]![column] = value;
    }
  }

  return {
    dimension,
    entries,
  };
};

export const p_adic_statistical_operator_from_rows = (rows: PAdicOperatorMatrix): PAdicStatisticalOperator | null => {
  const base = p_adic_operator_from_rows(rows);
  if (!base) {
    return null;
  }

  if (!p_adic_operator_is_selfadjoint(base)) {
    return null;
  }

  if (!p_adic_operator_is_trace_one(base)) {
    return null;
  }

  return {
    ...base,
    kind: "statistical_operator",
  };
};

const effectFromRows = (id: string, label: string, rows: PAdicOperatorMatrix): PAdicSovmEffect | null => {
  const operator = p_adic_operator_from_rows(rows);
  if (!operator || !p_adic_operator_is_selfadjoint(operator)) {
    return null;
  }

  return {
    id,
    label,
    operator,
  };
};

export const p_adic_sovm_from_rows = (
  effects: ReadonlyArray<{ id: string; label: string; rows: PAdicOperatorMatrix }>,
): PAdicSovm | null => {
  if (effects.length === 0) {
    return null;
  }

  const built: PAdicSovmEffect[] = [];
  for (const effect of effects) {
    const next = effectFromRows(effect.id, effect.label, effect.rows);
    if (!next) {
      return null;
    }
    built.push(next);
  }

  const dimension = built[0]!.operator.dimension;
  if (built.some((effect) => effect.operator.dimension !== dimension)) {
    return null;
  }

  let sum = {
    dimension,
    entries: Array.from({ length: dimension }, () => Array.from({ length: dimension }, () => 0)),
  } as PAdicOperator;
  for (const effect of built) {
    const next = p_adic_operator_add(sum, effect.operator);
    if (!next) {
      return null;
    }
    sum = next;
  }

  const identity = p_adic_identity_operator(dimension);
  if (!identity || !matrixEquals(sum.entries, identity.entries)) {
    return null;
  }

  return {
    dimension,
    effects: built,
  };
};

export const p_adic_trace_pairing = (rho: PAdicStatisticalOperator, effect: PAdicOperator): number | null => {
  const product = p_adic_operator_product(rho, effect);
  if (!product) {
    return null;
  }

  return p_adic_operator_trace(product);
};

export const p_adic_sovm_pairings = (
  rho: PAdicStatisticalOperator,
  sovm: PAdicSovm,
  prime: number,
): ReadonlyArray<PAdicSovmPairing> | null => {
  if (rho.dimension !== sovm.dimension) {
    return null;
  }

  const pairings: PAdicSovmPairing[] = [];
  for (const effect of sovm.effects) {
    const omega = p_adic_trace_pairing(rho, effect.operator);
    if (omega === null) {
      return null;
    }

    pairings.push({
      id: effect.id,
      label: effect.label,
      omega,
      valuation: p_adic_valuation_from_real(omega, prime),
      norm: p_adic_norm_from_real(omega, prime),
    });
  }

  return pairings;
};
