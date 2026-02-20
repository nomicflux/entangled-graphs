import { computed } from "vue";
import type { GateId } from "../../../types";
import { availablePAdicBuiltinGatesForQubitCount, operatorArityForGate, state } from "../../../state";
import type { PaletteEntry, PaletteGroup } from "../../circuit/palette-types";

const paletteBuiltinGates: readonly GateId[] = [
  "I",
  "X",
  "Y",
  "Z",
  "H",
  "S",
  "T",
  "M",
  "CNOT",
  "SWAP",
  "TOFFOLI",
  "CSWAP",
];

export const usePAdicCircuitPalette = () => {
  const paletteGates = computed<GateId[]>(() =>
    availablePAdicBuiltinGatesForQubitCount(state.pAdic.qubitCount).filter((gate) => paletteBuiltinGates.includes(gate)),
  );

  const paletteGroups = computed<PaletteGroup[]>(() => {
    const byArity = new Map<number, PaletteEntry[]>();

    for (const gate of paletteGates.value) {
      if (gate === "M") {
        continue;
      }

      const arity = operatorArityForGate(gate, []) ?? 0;
      const entries = byArity.get(arity) ?? [];
      entries.push({ id: gate, label: gate, isCustom: false });
      byArity.set(arity, entries);
    }

    return [...byArity.entries()]
      .sort(([left], [right]) => left - right)
      .map(([arity, entries]) => ({
        arity,
        title: `${arity}Q Gates`,
        entries,
      }));
  });

  const measurementEntries = computed<PaletteEntry[]>(() =>
    paletteGates.value.includes("M") ? [{ id: "M", label: "M", isCustom: false }] : [],
  );

  const isPaletteDraggable = (gate: GateId): boolean => (operatorArityForGate(gate, []) ?? 0) === 1;

  return {
    paletteGroups,
    measurementEntries,
    isPaletteDraggable,
  };
};
