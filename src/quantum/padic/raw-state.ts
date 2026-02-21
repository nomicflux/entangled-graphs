import { branchEpsilon } from "./constants";
import { p_adic_valuation_from_real } from "./measurement-model";
import type { PAdicRawPreparedQubit, PAdicState } from "./types";

const MAX_PREPARED_STATE_SUPPORT = 16_384;

const toLocalEntries = (entry: PAdicRawPreparedQubit, prime: number): Array<{ value: number; raw: string }> => {
  const localEntries = entry.localStates
    .filter((local) => Number.isInteger(local.value) && local.value >= 0 && local.value < prime)
    .map((local) => ({ value: local.value, raw: local.amplitude.raw }));

  if (localEntries.length > 0) {
    return localEntries;
  }

  return Array.from({ length: prime }, (_, value) => ({
    value,
    raw: value === 0 ? "1" : "0",
  }));
};

const sortedEntriesByMagnitude = (state: PAdicState): Array<[string, number]> =>
  [...state.entries()].sort((left, right) => {
    const magnitudeDelta = Math.abs(right[1]) - Math.abs(left[1]);
    if (Math.abs(magnitudeDelta) > branchEpsilon) {
      return magnitudeDelta;
    }
    return left[0].localeCompare(right[0]);
  });

export const prune_p_adic_state = (state: PAdicState, maxSupport: number = MAX_PREPARED_STATE_SUPPORT): PAdicState => {
  if (state.size <= maxSupport) {
    return state;
  }

  const next: PAdicState = new Map();
  for (const [basis, amplitude] of sortedEntriesByMagnitude(state).slice(0, maxSupport)) {
    next.set(basis, amplitude);
  }
  return next;
};

export const parse_p_adic_raw = (raw: string, p: number): number => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return 0;
  }

  const direct = Number.parseFloat(trimmed);
  if (Number.isFinite(direct) && /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?$/i.test(trimmed)) {
    return direct;
  }

  const normalized = trimmed.replace(/\s+/g, "").replace(/\*/g, "");
  const protectedExponents = normalized.replace(/\^\-/g, "^~").replace(/\^\+/g, "^@");
  const termSource = protectedExponents
    .replace(/-/g, "+-")
    .split("+")
    .map((entry) => entry.replace(/\^~/g, "^-").replace(/\^@/g, "^+").trim())
    .filter((entry) => entry.length > 0);

  let total = 0;
  for (const term of termSource) {
    const pMatch = term.match(/^([+-]?(?:\d*\.?\d+)?)?p(?:\^([+-]?\d+))?$/i);
    if (pMatch) {
      const coefRaw = pMatch[1];
      const exponentRaw = pMatch[2];
      const coefficient =
        coefRaw === undefined || coefRaw === "" || coefRaw === "+"
          ? 1
          : coefRaw === "-"
            ? -1
            : Number.parseFloat(coefRaw);
      const exponent = exponentRaw === undefined ? 1 : Number.parseInt(exponentRaw, 10);
      if (Number.isFinite(coefficient) && Number.isFinite(exponent)) {
        total += coefficient * Math.pow(p, exponent);
      }
      continue;
    }

    const value = Number.parseFloat(term);
    if (Number.isFinite(value)) {
      total += value;
    }
  }

  return Number.isFinite(total) ? total : 0;
};

export const p_adic_basis_from_digits = (digits: ReadonlyArray<number>): string => digits.map((digit) => String(digit)).join("");

export const p_adic_digits_from_basis = (basis: string): number[] =>
  [...basis].map((char) => {
    const parsed = Number.parseInt(char, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });

export const p_adic_prepared_state_from_raw_qubits = (
  preparedQubits: ReadonlyArray<PAdicRawPreparedQubit>,
  p: number,
): PAdicState => {
  let current: PAdicState = new Map([["", 1]]);

  for (const qubit of preparedQubits) {
    const localEntries = toLocalEntries(qubit, p)
      .map((local) => ({
        value: local.value,
        amplitude: parse_p_adic_raw(local.raw, p),
      }))
      .filter((local) => Math.abs(local.amplitude) > branchEpsilon);

    if (localEntries.length === 0) {
      return new Map();
    }

    const next: PAdicState = new Map();
    for (const [prefix, prefixAmplitude] of current.entries()) {
      for (const local of localEntries) {
        const basis = `${prefix}${local.value}`;
        const amplitude = prefixAmplitude * local.amplitude;
        const prior = next.get(basis) ?? 0;
        next.set(basis, prior + amplitude);
      }
    }

    current = prune_p_adic_state(next);
  }

  return current;
};

export const p_adic_valuation_from_raw = (raw: string, p: number): number =>
  p_adic_valuation_from_real(parse_p_adic_raw(raw, p), p);
