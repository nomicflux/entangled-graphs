export type PreparationTargetId = "one" | "plus" | "minus";

export type PreparationTarget = {
  id: PreparationTargetId;
  label: string;
  hint: string;
};

export type TargetVector = {
  x: number;
  y: number;
  z: number;
};
