import type {
  ClassicalBitAssignment,
  ClassicalBitRef,
  ClassicalPredicate,
  ClassicalRegisterSpec,
  ClassicalState,
  ClassicalStateBranch,
  StateEnsemble,
} from "./types";

const compareBits = (left: ClassicalBitRef, right: ClassicalBitRef): number =>
  left.register === right.register ? left.index - right.index : left.register.localeCompare(right.register);

export const classicalBitKey = (bit: ClassicalBitRef): string => `${bit.register}:${bit.index}`;

export const readClassicalBit = (state: ClassicalState | undefined, bit: ClassicalBitRef): 0 | 1 | null => {
  if (!state) {
    return null;
  }
  return state.find((entry) => entry.bit.register === bit.register && entry.bit.index === bit.index)?.value ?? null;
};

export const writeClassicalBit = (state: ClassicalState | undefined, bit: ClassicalBitRef, value: 0 | 1): ClassicalState => {
  const next: ClassicalBitAssignment[] = [];
  let replaced = false;

  for (const entry of state ?? []) {
    if (entry.bit.register === bit.register && entry.bit.index === bit.index) {
      if (!replaced) {
        next.push({ bit, value });
        replaced = true;
      }
      continue;
    }
    next.push(entry);
  }

  if (!replaced) {
    next.push({ bit, value });
  }

  next.sort((left, right) => compareBits(left.bit, right.bit));
  return next;
};

export const readClassicalRegister = (
  state: ClassicalState | undefined,
  spec: Pick<ClassicalRegisterSpec, "id"> & { size: number },
): ReadonlyArray<0 | 1 | null> =>
  Array.from({ length: spec.size }, (_, index) => readClassicalBit(state, { register: spec.id, index }));

export const classicalPredicateMatches = (state: ClassicalState | undefined, predicate: ClassicalPredicate | undefined): boolean => {
  if (!predicate) {
    return true;
  }

  if (predicate.kind === "bit-equals") {
    return readClassicalBit(state, predicate.bit) === predicate.value;
  }

  if (predicate.kind === "register-equals") {
    return predicate.value.every((expected, index) => readClassicalBit(state, { register: predicate.register, index }) === expected);
  }

  return predicate.predicates.every((entry) => classicalPredicateMatches(state, entry));
};

export const classicalStatesFromEnsemble = (ensemble: StateEnsemble): ReadonlyArray<ClassicalStateBranch> =>
  ensemble.map((branch) => ({
    weight: branch.weight,
    state: branch.classicalState ?? [],
  }));

export const formatClassicalBits = (bits: ReadonlyArray<0 | 1 | null>): string =>
  bits.map((bit) => (bit === null ? "?" : String(bit))).join("");
