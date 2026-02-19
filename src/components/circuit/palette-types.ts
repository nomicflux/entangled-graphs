import type { GateId } from "../../types";

export type PaletteEntry = {
  id: GateId;
  label: string;
  isCustom: boolean;
};

export type PaletteGroup = {
  arity: number;
  title: string;
  entries: PaletteEntry[];
};
