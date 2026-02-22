const ROOT_SCALE = 1_000_000;

const vpInteger = (value: number, prime: number): number => {
  if (value === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let remaining = Math.abs(Math.trunc(value));
  let valuation = 0;
  while (remaining !== 0 && remaining % prime === 0) {
    remaining /= prime;
    valuation += 1;
  }
  return valuation;
};

const valuationFromMagnitude = (magnitude: number, prime: number): number => {
  const scaled = Math.round(Math.abs(magnitude) * ROOT_SCALE);
  if (scaled === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return vpInteger(scaled, prime) - vpInteger(ROOT_SCALE, prime);
};

export const pAdicValuationFromReal = (value: number, prime: number): number =>
  valuationFromMagnitude(Math.abs(value), prime);

export const pAdicNormFromReal = (value: number, prime: number): number => {
  if (value === 0) {
    return 0;
  }

  const valuation = pAdicValuationFromReal(value, prime);
  if (!Number.isFinite(valuation)) {
    return 0;
  }

  return Math.pow(prime, -valuation);
};

export const unitResidueFromReal = (value: number, valuation: number, prime: number): number | null => {
  if (!Number.isFinite(value) || value === 0 || !Number.isFinite(valuation)) {
    return null;
  }

  const unit = value * Math.pow(prime, valuation);
  if (!Number.isFinite(unit)) {
    return null;
  }

  const quantized = Math.round(unit * ROOT_SCALE);
  return ((quantized % prime) + prime) % prime;
};
