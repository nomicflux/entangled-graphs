import {
  addPAdicScalars,
  multiplyPAdicScalars,
  pAdicScalarFromFraction,
  pAdicScalarToNumber,
  type PAdicScalar,
} from "./scalar";

const powBigInt = (base: bigint, exponent: number): bigint => {
  if (!Number.isInteger(exponent) || exponent < 0) {
    throw new Error("Exponent must be a non-negative integer.");
  }

  let result = 1n;
  for (let index = 0; index < exponent; index += 1) {
    result *= base;
  }
  return result;
};

const scalarFromInteger = (value: bigint): PAdicScalar => pAdicScalarFromFraction(value, 1n);

const parseFractionToken = (token: string): PAdicScalar | null => {
  const match = token.match(/^([+-]?\d+)\/([+-]?\d+)$/);
  if (!match) {
    return null;
  }

  const numerator = BigInt(match[1]);
  const denominator = BigInt(match[2]);
  if (denominator === 0n) {
    return null;
  }

  return pAdicScalarFromFraction(numerator, denominator);
};

const parseFiniteDecimalToken = (token: string): PAdicScalar | null => {
  const match = token.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);
  if (!match) {
    return null;
  }

  const signToken = match[1] ?? "";
  const integerPart = match[2] ?? "";
  const fractionalPart = match[3] ?? match[4] ?? "";
  const exponentToken = match[5];

  const digits = `${integerPart}${fractionalPart}`;
  if (!/^\d+$/.test(digits)) {
    return null;
  }

  let numerator = BigInt(digits);
  let denominator = powBigInt(10n, fractionalPart.length);
  const exponent = exponentToken === undefined ? 0 : Number.parseInt(exponentToken, 10);
  if (!Number.isInteger(exponent)) {
    return null;
  }

  if (exponent > 0) {
    numerator *= powBigInt(10n, exponent);
  } else if (exponent < 0) {
    denominator *= powBigInt(10n, -exponent);
  }

  if (signToken === "-") {
    numerator = -numerator;
  }

  return pAdicScalarFromFraction(numerator, denominator);
};

const parseNumericToken = (token: string): PAdicScalar | null => parseFractionToken(token) ?? parseFiniteDecimalToken(token);

const parsePrimePower = (prime: number, exponent: number): PAdicScalar => {
  const p = BigInt(prime);
  if (exponent >= 0) {
    return scalarFromInteger(powBigInt(p, exponent));
  }

  return pAdicScalarFromFraction(1n, powBigInt(p, -exponent));
};

const parseTermScalar = (term: string, prime: number): PAdicScalar | null => {
  const pMatch = term.match(/^([+-]?(?:(?:\d+\/\d+)|(?:\d*\.?\d+(?:e[-+]?\d+)?))?)?p(?:\^([+-]?\d+))?$/i);
  if (pMatch) {
    const coefficientToken = pMatch[1];
    const exponentToken = pMatch[2];
    let coefficient: PAdicScalar;
    if (coefficientToken === undefined || coefficientToken === "" || coefficientToken === "+") {
      coefficient = scalarFromInteger(1n);
    } else if (coefficientToken === "-") {
      coefficient = scalarFromInteger(-1n);
    } else {
      const parsedCoefficient = parseNumericToken(coefficientToken);
      if (parsedCoefficient === null) {
        return null;
      }
      coefficient = parsedCoefficient;
    }

    const exponent = exponentToken === undefined ? 1 : Number.parseInt(exponentToken, 10);
    if (!Number.isInteger(exponent)) {
      return null;
    }

    return multiplyPAdicScalars(coefficient, parsePrimePower(prime, exponent));
  }

  return parseNumericToken(term);
};

export const parsePAdicScalarRaw = (raw: string, prime: number): PAdicScalar => {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return scalarFromInteger(0n);
  }

  const direct = parseNumericToken(trimmed);
  if (direct !== null) {
    return direct;
  }

  const normalized = trimmed.replace(/\s+/g, "").replace(/\*/g, "");
  const protectedExponents = normalized.replace(/\^\-/g, "^~").replace(/\^\+/g, "^@");
  const terms = protectedExponents
    .replace(/-/g, "+-")
    .split("+")
    .map((entry) => entry.replace(/\^~/g, "^-").replace(/\^@/g, "^+").trim())
    .filter((entry) => entry.length > 0);

  let total = scalarFromInteger(0n);
  for (const term of terms) {
    const parsed = parseTermScalar(term, prime);
    if (parsed === null) {
      return scalarFromInteger(0n);
    }
    total = addPAdicScalars(total, parsed);
  }

  return total;
};

export const parsePAdicRaw = (raw: string, prime: number): number =>
  pAdicScalarToNumber(parsePAdicScalarRaw(raw, prime));
