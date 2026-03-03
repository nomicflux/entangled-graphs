import * as complex from "../complex";
import { basisLabels } from "../basis";
import { H } from "../operator";
import type {
  BasisProbability,
  Complex,
  DensityMatrix,
  GateId,
  MeasurementBasis,
  MixedCircuitColumn,
  MixedGateProcess,
  NoiseChannelId,
  NoiseStrengthPreset,
  Operator,
  Qubit,
  ValidSingleQubitDensity,
} from "../types";

type RandomSource = () => number;
export type MixedGateResolver = (gate: GateId) => Operator | null;

export type MixedCircuitMeasurementOutcome = {
  column: number;
  gateId: string;
  wire: number;
  value: 0 | 1;
  probability: number;
};

export type MixedSamplingReplayOptions = {
  priorOutcomes?: ReadonlyArray<Pick<MixedCircuitMeasurementOutcome, "gateId" | "value">>;
  resampleFromGateId?: string;
};

export type SampledMixedCircuitRun = {
  finalRho: DensityMatrix;
  finalSample: {
    basis: BasisProbability["basis"];
    probability: number;
  };
  outcomes: ReadonlyArray<MixedCircuitMeasurementOutcome>;
};

const densityEpsilon = 1e-12;

const cloneComplex = (value: Complex): Complex => ({ real: value.real, imag: value.imag });

const zeroComplex = (): Complex => complex.from_real(0);

const zeroMatrix = (order: number): Complex[][] =>
  Array.from({ length: order }, () => Array.from({ length: order }, () => zeroComplex()));

const identityMatrix = (order: number): Complex[][] =>
  Array.from({ length: order }, (_, row) =>
    Array.from({ length: order }, (_, column) => (row === column ? complex.from_real(1) : complex.from_real(0))),
  );

const cloneMatrix = (matrix: DensityMatrix): Complex[][] =>
  matrix.map((row) => row.map((value) => cloneComplex(value)));

const matrixOrderForQubitCount = (qubitCount: number): number => 1 << qubitCount;

const densityMatrixQubitCount = (rho: DensityMatrix): number => Math.log2(rho.length);

const addMatrices = (left: DensityMatrix, right: DensityMatrix): Complex[][] =>
  left.map((row, rowIndex) =>
    row.map((value, columnIndex) => complex.add(value, right[rowIndex]![columnIndex]!)),
  );

const subtractMatrices = (left: DensityMatrix, right: DensityMatrix): Complex[][] =>
  left.map((row, rowIndex) =>
    row.map((value, columnIndex) => complex.add(value, complex.scale(right[rowIndex]![columnIndex]!, -1))),
  );

const scaleMatrix = (matrix: DensityMatrix, scalar: number): Complex[][] =>
  matrix.map((row) => row.map((value) => complex.scale(value, scalar)));

const matrixMultiply = (left: DensityMatrix, right: DensityMatrix): Complex[][] => {
  const order = left.length;
  const product = zeroMatrix(order);

  for (let row = 0; row < order; row += 1) {
    for (let column = 0; column < order; column += 1) {
      let sum = zeroComplex();
      for (let pivot = 0; pivot < order; pivot += 1) {
        sum = complex.add(sum, complex.mult(left[row]![pivot]!, right[pivot]![column]!));
      }
      product[row]![column] = sum;
    }
  }

  return product;
};

const conjugateTranspose = (matrix: DensityMatrix): Complex[][] =>
  matrix[0]!.map((_, column) => matrix.map((row) => complex.conjugate(row[column]!)));

const trace = (matrix: DensityMatrix): number =>
  matrix.reduce((total, row, index) => total + row[index]!.real, 0);

const normalizeDensityTrace = (rho: DensityMatrix): Complex[][] => {
  const rhoTrace = trace(rho);
  if (Math.abs(rhoTrace) <= densityEpsilon) {
    return cloneMatrix(rho);
  }
  if (Math.abs(rhoTrace - 1) <= 1e-9) {
    return cloneMatrix(rho);
  }
  return scaleMatrix(rho, 1 / rhoTrace);
};

const tensorProductMatrices = (left: DensityMatrix, right: DensityMatrix): Complex[][] => {
  const leftOrder = left.length;
  const rightOrder = right.length;
  const totalOrder = leftOrder * rightOrder;

  return Array.from({ length: totalOrder }, (_, row) => {
    const rowLeft = Math.floor(row / rightOrder);
    const rowRight = row % rightOrder;

    return Array.from({ length: totalOrder }, (_, column) => {
      const columnLeft = Math.floor(column / rightOrder);
      const columnRight = column % rightOrder;
      return complex.mult(left[rowLeft]![columnLeft]!, right[rowRight]![columnRight]!);
    });
  });
};

const bitMaskForWire = (wire: number, qubitCount: number): number => 1 << (qubitCount - 1 - wire);

const basisPatternForIndex = (index: number, wires: ReadonlyArray<number>, qubitCount: number): number =>
  wires.reduce((pattern, wire, offset) => {
    const bit = (index & bitMaskForWire(wire, qubitCount)) === 0 ? 0 : 1;
    return pattern | (bit << (wires.length - 1 - offset));
  }, 0);

const embeddedOperatorMatrix = (
  operatorMatrix: DensityMatrix,
  wires: ReadonlyArray<number>,
  qubitCount: number,
): Complex[][] => {
  const order = matrixOrderForQubitCount(qubitCount);
  const embedded = zeroMatrix(order);
  const combinedMask = wires.reduce((mask, wire) => mask | bitMaskForWire(wire, qubitCount), 0);

  for (let row = 0; row < order; row += 1) {
    for (let column = 0; column < order; column += 1) {
      if ((row & ~combinedMask) !== (column & ~combinedMask)) {
        continue;
      }
      const rowPattern = basisPatternForIndex(row, wires, qubitCount);
      const columnPattern = basisPatternForIndex(column, wires, qubitCount);
      embedded[row]![column] = cloneComplex(operatorMatrix[rowPattern]![columnPattern]!);
    }
  }

  return embedded;
};

const applyEmbeddedUnitary = (rho: DensityMatrix, embeddedUnitary: DensityMatrix): Complex[][] => {
  const leftApplied = matrixMultiply(embeddedUnitary, rho);
  return normalizeDensityTrace(matrixMultiply(leftApplied, conjugateTranspose(embeddedUnitary)));
};

const projectorForWireAndValue = (wire: number, qubitCount: number, value: 0 | 1): Complex[][] => {
  const order = matrixOrderForQubitCount(qubitCount);
  const mask = bitMaskForWire(wire, qubitCount);
  const projector = zeroMatrix(order);

  for (let index = 0; index < order; index += 1) {
    const bit = (index & mask) === 0 ? 0 : 1;
    if (bit === value) {
      projector[index]![index] = complex.from_real(1);
    }
  }

  return projector;
};

const sampleDistribution = (
  distribution: BasisProbability[],
  randomValue: number = Math.random(),
): { basis: BasisProbability["basis"]; probability: number } => {
  const total = distribution.reduce((sum, entry) => sum + entry.probability, 0);
  if (total <= densityEpsilon) {
    const fallback = distribution[distribution.length - 1]!;
    return { basis: fallback.basis, probability: 0 };
  }

  const threshold = randomValue * total;
  let running = 0;
  for (const entry of distribution) {
    running += entry.probability;
    if (threshold <= running) {
      return { basis: entry.basis, probability: entry.probability };
    }
  }

  const fallback = distribution[distribution.length - 1]!;
  return { basis: fallback.basis, probability: fallback.probability };
};

const probabilityForMeasurementOnWire = (rho: DensityMatrix, wire: number, value: 0 | 1): number => {
  const qubitCount = densityMatrixQubitCount(rho);
  const mask = bitMaskForWire(wire, qubitCount);
  let probability = 0;

  for (let index = 0; index < rho.length; index += 1) {
    const bit = (index & mask) === 0 ? 0 : 1;
    if (bit === value) {
      probability += rho[index]![index]!.real;
    }
  }

  return Math.max(0, probability);
};

const collapseDensityMatrixOnWire = (
  rho: DensityMatrix,
  wire: number,
  value: 0 | 1,
): { probability: number; rho: DensityMatrix } => {
  const qubitCount = densityMatrixQubitCount(rho);
  const projector = projectorForWireAndValue(wire, qubitCount, value);
  const collapsed = matrixMultiply(matrixMultiply(projector, rho), projector);
  const probability = Math.max(0, trace(collapsed));
  if (probability <= densityEpsilon) {
    return { probability: 0, rho: cloneMatrix(rho) };
  }
  return { probability, rho: scaleMatrix(collapsed, 1 / probability) };
};

const selectMeasurementOnWire = (
  rho: DensityMatrix,
  wire: number,
  selectedValue: 0 | 1,
): { probability: number; rho: DensityMatrix } => collapseDensityMatrixOnWire(rho, wire, selectedValue);

const sampleMeasurementOnWire = (
  rho: DensityMatrix,
  wire: number,
  randomValue: number,
): { value: 0 | 1; probability: number; rho: DensityMatrix } => {
  const zeroProbability = probabilityForMeasurementOnWire(rho, wire, 0);
  const oneProbability = probabilityForMeasurementOnWire(rho, wire, 1);
  const total = zeroProbability + oneProbability;

  if (total <= densityEpsilon) {
    return { value: 0, probability: 0, rho: cloneMatrix(rho) };
  }

  if (randomValue * total <= zeroProbability || oneProbability <= densityEpsilon) {
    const zeroCollapse = collapseDensityMatrixOnWire(rho, wire, 0);
    return { value: 0, probability: zeroCollapse.probability, rho: zeroCollapse.rho };
  }

  const oneCollapse = collapseDensityMatrixOnWire(rho, wire, 1);
  return { value: 1, probability: oneCollapse.probability, rho: oneCollapse.rho };
};

const singleQubitRotationForBasis = (basis: MeasurementBasis): DensityMatrix => {
  if (basis === "x") {
    return H.matrix;
  }
  if (basis === "y") {
    const sDagger: DensityMatrix = [
      [complex.from_real(1), complex.from_real(0)],
      [complex.from_real(0), complex.complex(0, -1)],
    ];
    return matrixMultiply(H.matrix, sDagger);
  }
  return identityMatrix(2);
};

const rotateDensityMatrixForBasis = (rho: DensityMatrix, basis: MeasurementBasis): DensityMatrix => {
  if (basis === "z") {
    return cloneMatrix(rho);
  }

  const qubitCount = densityMatrixQubitCount(rho);
  let rotation: DensityMatrix = [[complex.from_real(1)]];
  const singleQubitRotation = singleQubitRotationForBasis(basis);

  for (let wire = 0; wire < qubitCount; wire += 1) {
    rotation = tensorProductMatrices(rotation, singleQubitRotation);
  }

  return applyEmbeddedUnitary(rho, rotation);
};

const krausOperatorsForNoise = (channelId: NoiseChannelId, strength: NoiseStrengthPreset): DensityMatrix[] => {
  if (strength === 0) {
    return [identityMatrix(2)];
  }

  if (channelId === "bit-flip") {
    return [
      [
        [complex.from_real(Math.sqrt(1 - strength)), complex.from_real(0)],
        [complex.from_real(0), complex.from_real(Math.sqrt(1 - strength))],
      ],
      [
        [complex.from_real(0), complex.from_real(Math.sqrt(strength))],
        [complex.from_real(Math.sqrt(strength)), complex.from_real(0)],
      ],
    ];
  }

  if (channelId === "phase-flip") {
    return [
      [
        [complex.from_real(Math.sqrt(1 - strength)), complex.from_real(0)],
        [complex.from_real(0), complex.from_real(Math.sqrt(1 - strength))],
      ],
      [
        [complex.from_real(Math.sqrt(strength)), complex.from_real(0)],
        [complex.from_real(0), complex.from_real(-Math.sqrt(strength))],
      ],
    ];
  }

  if (channelId === "dephasing") {
    return [
      [
        [complex.from_real(Math.sqrt(1 - strength)), complex.from_real(0)],
        [complex.from_real(0), complex.from_real(Math.sqrt(1 - strength))],
      ],
      [
        [complex.from_real(Math.sqrt(strength)), complex.from_real(0)],
        [complex.from_real(0), complex.from_real(0)],
      ],
      [
        [complex.from_real(0), complex.from_real(0)],
        [complex.from_real(0), complex.from_real(Math.sqrt(strength))],
      ],
    ];
  }

  if (channelId === "depolarizing") {
    const weight = Math.sqrt(strength / 4);
    return [
      [
        [complex.from_real(Math.sqrt(1 - (3 * strength) / 4)), complex.from_real(0)],
        [complex.from_real(0), complex.from_real(Math.sqrt(1 - (3 * strength) / 4))],
      ],
      [
        [complex.from_real(0), complex.from_real(weight)],
        [complex.from_real(weight), complex.from_real(0)],
      ],
      [
        [complex.from_real(0), complex.complex(0, -weight)],
        [complex.complex(0, weight), complex.from_real(0)],
      ],
      [
        [complex.from_real(weight), complex.from_real(0)],
        [complex.from_real(0), complex.from_real(-weight)],
      ],
    ];
  }

  return [
    [
      [complex.from_real(1), complex.from_real(0)],
      [complex.from_real(0), complex.from_real(Math.sqrt(1 - strength))],
    ],
    [
      [complex.from_real(0), complex.from_real(Math.sqrt(strength))],
      [complex.from_real(0), complex.from_real(0)],
    ],
  ];
};

export const singleQubitDensityMatrix = (density: ValidSingleQubitDensity): DensityMatrix => [
  [complex.from_real(density.rho00), cloneComplex(density.rho01)],
  [complex.conjugate(density.rho01), complex.from_real(density.rho11)],
];

export const densityMatrixForSingleQubitPureState = (qubit: Qubit): DensityMatrix => [
  [
    complex.mult(qubit.a, complex.conjugate(qubit.a)),
    complex.mult(qubit.a, complex.conjugate(qubit.b)),
  ],
  [
    complex.mult(qubit.b, complex.conjugate(qubit.a)),
    complex.mult(qubit.b, complex.conjugate(qubit.b)),
  ],
];

export const tensorProductDensityMatrices = (matrices: ReadonlyArray<DensityMatrix>): DensityMatrix => {
  let rho: DensityMatrix = [[complex.from_real(1)]];

  for (const matrix of matrices) {
    rho = tensorProductMatrices(rho, matrix);
  }

  return rho;
};

export const zeroDensityMatrix = (qubitCount: number): DensityMatrix => {
  const order = matrixOrderForQubitCount(qubitCount);
  const rho = zeroMatrix(order);
  rho[0]![0] = complex.from_real(1);
  return rho;
};

export const measurementDistributionForDensityMatrix = (rho: DensityMatrix): BasisProbability[] => {
  const qubitCount = densityMatrixQubitCount(rho);
  const labels = basisLabels(qubitCount);
  const total = trace(rho);
  const normalization = total <= densityEpsilon ? 1 : total;

  return labels.map((basis, index) => ({
    basis,
    probability: Math.max(0, rho[index]![index]!.real / normalization),
  }));
};

export const measurementDistributionForDensityMatrixInBasis = (
  rho: DensityMatrix,
  basis: MeasurementBasis,
): BasisProbability[] => measurementDistributionForDensityMatrix(rotateDensityMatrixForBasis(rho, basis));

export const preferredMeasurementBasisForDensityMatrix = (rho: DensityMatrix): MeasurementBasis => {
  const order = rho.length;
  const uniform = 1 / order;
  let bestBasis: MeasurementBasis = "z";
  let bestContrast = -1;

  for (const basis of ["z", "x", "y"] as const) {
    const contrast = measurementDistributionForDensityMatrixInBasis(rho, basis).reduce(
      (sum, entry) => sum + Math.abs(entry.probability - uniform),
      0,
    );

    if (contrast > bestContrast + 1e-9) {
      bestBasis = basis;
      bestContrast = contrast;
    }
  }

  return bestBasis;
};

export const nonSelectiveMeasurementOnWire = (rho: DensityMatrix, wire: number, qubitCount: number): DensityMatrix => {
  const mask = bitMaskForWire(wire, qubitCount);

  return rho.map((row, rowIndex) =>
    row.map((value, columnIndex) => (((rowIndex ^ columnIndex) & mask) === 0 ? cloneComplex(value) : zeroComplex())),
  );
};

export const applyNoiseChannelToDensityMatrix = (
  rho: DensityMatrix,
  channelId: NoiseChannelId,
  strength: NoiseStrengthPreset,
  wire: number,
  qubitCount: number,
): DensityMatrix => {
  const operators = krausOperatorsForNoise(channelId, strength);
  let next = zeroMatrix(rho.length);

  for (const operator of operators) {
    const embedded = embeddedOperatorMatrix(operator, [wire], qubitCount);
    const evolved = matrixMultiply(matrixMultiply(embedded, rho), conjugateTranspose(embedded));
    next = addMatrices(next, evolved);
  }

  return normalizeDensityTrace(next);
};

export const applyMixedProcessToDensityMatrix = (
  rho: DensityMatrix,
  process: MixedGateProcess,
  wires: ReadonlyArray<number>,
  qubitCount: number,
  resolveGate: MixedGateResolver,
): DensityMatrix => {
  if (process.kind === "measurement") {
    return nonSelectiveMeasurementOnWire(rho, wires[0]!, qubitCount);
  }

  if (process.kind === "noise") {
    return applyNoiseChannelToDensityMatrix(rho, process.channelId, process.strength, wires[0]!, qubitCount);
  }

  const operator = resolveGate(process.gateId);
  if (operator === null) {
    return cloneMatrix(rho);
  }
  const embedded = embeddedOperatorMatrix(operator.matrix, wires, qubitCount);
  return applyEmbeddedUnitary(rho, embedded);
};

export const simulateMixedColumns = (
  prepared: DensityMatrix,
  columns: ReadonlyArray<MixedCircuitColumn>,
  resolveGate: MixedGateResolver,
  qubitCount: number,
): DensityMatrix[] => {
  const snapshots: DensityMatrix[] = [cloneMatrix(prepared)];
  let current: DensityMatrix = cloneMatrix(prepared);

  for (const column of columns) {
    for (const gate of column.gates) {
      current = applyMixedProcessToDensityMatrix(current, gate.process, gate.wires, qubitCount, resolveGate);
    }
    snapshots.push(current);
  }

  return snapshots;
};

export const sampleMixedCircuitRun = (
  prepared: DensityMatrix,
  columns: ReadonlyArray<MixedCircuitColumn>,
  resolveGate: MixedGateResolver,
  qubitCount: number,
  random: RandomSource = Math.random,
  replay: MixedSamplingReplayOptions = {},
): SampledMixedCircuitRun => {
  const replayByGateId = new Map((replay.priorOutcomes ?? []).map((entry) => [entry.gateId, entry.value]));
  let replayLocked = replay.resampleFromGateId !== undefined;
  let current: DensityMatrix = cloneMatrix(prepared);
  const outcomes: MixedCircuitMeasurementOutcome[] = [];

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex]!;
    for (const gate of column.gates) {
      if (gate.process.kind === "measurement") {
        const shouldReplay = replayLocked && gate.id !== replay.resampleFromGateId;
        const replayedValue = shouldReplay ? replayByGateId.get(gate.id) : undefined;
        const sampled =
          replayedValue === undefined
            ? sampleMeasurementOnWire(current, gate.wires[0]!, random())
            : (() => {
                const selected = selectMeasurementOnWire(current, gate.wires[0]!, replayedValue);
                return selected.probability <= densityEpsilon
                  ? sampleMeasurementOnWire(current, gate.wires[0]!, random())
                  : { value: replayedValue, probability: selected.probability, rho: selected.rho };
              })();

        outcomes.push({
          column: columnIndex,
          gateId: gate.id,
          wire: gate.wires[0]!,
          value: sampled.value,
          probability: sampled.probability,
        });
        current = sampled.rho;
        if (gate.id === replay.resampleFromGateId) {
          replayLocked = false;
        }
        continue;
      }

      current = applyMixedProcessToDensityMatrix(current, gate.process, gate.wires, qubitCount, resolveGate);
    }
  }

  const finalSample = sampleDistribution(measurementDistributionForDensityMatrix(current), random());
  return { finalRho: current, finalSample, outcomes };
};

export const frobeniusNorm = (matrix: DensityMatrix): number =>
  Math.sqrt(
    matrix.reduce(
      (sum, row) => sum + row.reduce((rowSum, value) => rowSum + complex.magnitude_squared(value), 0),
      0,
    ),
  );

export const densityTensorDifferenceNorm = (left: DensityMatrix, right: DensityMatrix): number =>
  frobeniusNorm(subtractMatrices(left, right));
