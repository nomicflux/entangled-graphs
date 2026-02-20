import type { BlochParams } from "../../../types";

export const loadBlochParams = (key: string, fallback: BlochParams): BlochParams => {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BlochParams>;
    if (typeof parsed.theta !== "number" || typeof parsed.phi !== "number") {
      return fallback;
    }
    return { theta: parsed.theta, phi: parsed.phi };
  } catch {
    return fallback;
  }
};

export const saveBlochParams = (key: string, value: BlochParams): void => {
  window.localStorage.setItem(key, JSON.stringify(value));
};
