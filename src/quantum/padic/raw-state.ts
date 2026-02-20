import type { Qubit, QubitState } from "../../types";
import * as complex from "../../complex";
import { tensor_product_qubits } from "../core";
import { branchEpsilon } from "./constants";

export type PAdicRawPreparedQubit = {
  a: { raw: string };
  b: { raw: string };
};

const parsePAdicRaw = (raw: string, p: number): number => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return 0;
  }

  const direct = Number.parseFloat(trimmed);
  if (Number.isFinite(direct) && /^[-+]?\d*\.?\d+(?:e[-+]?\d+)?$/i.test(trimmed)) {
    return direct;
  }

  const normalized = trimmed.replace(/\s+/g, "").replace(/\*/g, "");
  const termSource = normalized
    .replace(/-/g, "+-")
    .split("+")
    .map((entry) => entry.trim())
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

export const p_adic_qubit_from_raw = (aRaw: string, bRaw: string, p: number): Qubit => {
  const aReal = parsePAdicRaw(aRaw, p);
  const bReal = parsePAdicRaw(bRaw, p);
  const mass = (aReal * aReal) + (bReal * bReal);

  if (mass <= branchEpsilon) {
    return {
      a: complex.from_real(1),
      b: complex.from_real(0),
    };
  }

  const normalizer = 1 / Math.sqrt(mass);
  return {
    a: complex.from_real(aReal * normalizer),
    b: complex.from_real(bReal * normalizer),
  };
};

export const p_adic_prepared_state_from_raw_qubits = (
  preparedQubits: ReadonlyArray<PAdicRawPreparedQubit>,
  p: number,
): QubitState => {
  const qubits = preparedQubits.map((entry) => p_adic_qubit_from_raw(entry.a.raw, entry.b.raw, p));
  return tensor_product_qubits(qubits);
};
