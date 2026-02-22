export const parsePAdicRaw = (raw: string, prime: number): number => {
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
  const terms = protectedExponents
    .replace(/-/g, "+-")
    .split("+")
    .map((entry) => entry.replace(/\^~/g, "^-").replace(/\^@/g, "^+").trim())
    .filter((entry) => entry.length > 0);

  let total = 0;
  for (const term of terms) {
    const pMatch = term.match(/^([+-]?(?:\d*\.?\d+)?)?p(?:\^([+-]?\d+))?$/i);
    if (pMatch) {
      const coefficientToken = pMatch[1];
      const exponentToken = pMatch[2];
      const coefficient =
        coefficientToken === undefined || coefficientToken === "" || coefficientToken === "+"
          ? 1
          : coefficientToken === "-"
            ? -1
            : Number.parseFloat(coefficientToken);
      const exponent = exponentToken === undefined ? 1 : Number.parseInt(exponentToken, 10);
      total += coefficient * Math.pow(prime, exponent);
      continue;
    }

    total += Number.parseFloat(term);
  }

  return Number.isFinite(total) ? total : 0;
};
