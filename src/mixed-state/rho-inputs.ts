import * as complex from "../complex";
import type { RawSingleQubitRhoInput, ValidSingleQubitDensity } from "../types";

export type RhoPresetId = "zero" | "one" | "plus" | "minus" | "mixed" | "dephased-plus";

export type ParsedRhoCard = {
  validDensity: ValidSingleQubitDensity | null;
  errors: string[];
};

const traceTolerance = 1e-6;
const psdTolerance = 1e-8;

export const rhoPresetInput = (preset: RhoPresetId): RawSingleQubitRhoInput => {
  if (preset === "one") {
    return { rho00: "0", rho11: "1", rho01Real: "0", rho01Imag: "0" };
  }
  if (preset === "plus") {
    return { rho00: "0.5", rho11: "0.5", rho01Real: "0.5", rho01Imag: "0" };
  }
  if (preset === "minus") {
    return { rho00: "0.5", rho11: "0.5", rho01Real: "-0.5", rho01Imag: "0" };
  }
  if (preset === "mixed") {
    return { rho00: "0.5", rho11: "0.5", rho01Real: "0", rho01Imag: "0" };
  }
  if (preset === "dephased-plus") {
    return { rho00: "0.5", rho11: "0.5", rho01Real: "0.1", rho01Imag: "0" };
  }
  return { rho00: "1", rho11: "0", rho01Real: "0", rho01Imag: "0" };
};

export const createEmptyRhoInput = (): RawSingleQubitRhoInput => rhoPresetInput("zero");

export const RHO_PRESET_OPTIONS: ReadonlyArray<{ id: RhoPresetId; label: string }> = [
  { id: "zero", label: "|0><0|" },
  { id: "one", label: "|1><1|" },
  { id: "plus", label: "|+><+|" },
  { id: "minus", label: "|-><-|" },
  { id: "mixed", label: "I/2" },
  { id: "dephased-plus", label: "Deph |+>" },
];

const parseNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseSingleQubitDensityInput = (input: RawSingleQubitRhoInput): ParsedRhoCard => {
  const rho00 = parseNumber(input.rho00);
  const rho11 = parseNumber(input.rho11);
  const rho01Real = parseNumber(input.rho01Real);
  const rho01Imag = parseNumber(input.rho01Imag);
  const errors: string[] = [];

  if (rho00 === null || rho11 === null || rho01Real === null || rho01Imag === null) {
    return { validDensity: null, errors: ["All rho fields must be finite numbers."] };
  }

  if (rho00 < -psdTolerance || rho11 < -psdTolerance) {
    errors.push("Diagonal entries must be non-negative.");
  }

  if (Math.abs((rho00 + rho11) - 1) > traceTolerance) {
    errors.push("Trace must equal 1.");
  }

  const determinant = (rho00 * rho11) - ((rho01Real * rho01Real) + (rho01Imag * rho01Imag));
  if (determinant < -psdTolerance) {
    errors.push("Matrix must be positive semidefinite.");
  }

  if (errors.length > 0) {
    return { validDensity: null, errors };
  }

  return {
    validDensity: {
      rho00,
      rho11,
      rho01: complex.complex(rho01Real, rho01Imag),
    },
    errors: [],
  };
};
