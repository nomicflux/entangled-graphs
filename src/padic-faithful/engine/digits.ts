import type { PAdicDigitExpansion } from "../types";

const SCALE = 1_000_000;

export const pAdicDigitsFromReal = (value: number, prime: number, maxDigits: number = 10): PAdicDigitExpansion => {
  if (value === 0 || !Number.isFinite(value)) {
    return {
      sign: 1,
      digits: [0],
      truncated: false,
      text: "0",
    };
  }

  const sign: 1 | -1 = value < 0 ? -1 : 1;
  let remaining = Math.abs(Math.round(value * SCALE));
  const digits: number[] = [];

  while (remaining > 0 && digits.length < maxDigits) {
    digits.unshift(remaining % prime);
    remaining = Math.floor(remaining / prime);
  }

  if (digits.length === 0) {
    digits.push(0);
  }

  const truncated = remaining > 0;
  const signPrefix = sign < 0 ? "-" : "";
  const suffix = truncated ? " ..." : "";

  return {
    sign,
    digits,
    truncated,
    text: `${signPrefix}${digits.join(" ")}${suffix}`,
  };
};
