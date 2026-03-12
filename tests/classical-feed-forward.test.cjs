const test = require("node:test");
const assert = require("node:assert/strict");
const { effectScope } = require("vue");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");
const { useTeleportationModel } = require("../.tmp-test/components/algorithms/teleportation/useTeleportationModel.js");

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };
const ketOne = { a: complex.from_real(0), b: complex.from_real(1) };

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const distributionMap = (distribution) => new Map(distribution.map((entry) => [entry.basis, entry.probability]));

test("ensemble simulation carries classical bits into conditioned gates", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h", gate: "H", wires: [0] }] },
    { gates: [{ id: "m", gate: "M", wires: [0], writesClassicalBit: { register: "c", index: 0 } }] },
    {
      gates: [
        {
          id: "x-if-c1",
          gate: "X",
          wires: [1],
          condition: { kind: "bit-equals", bit: { register: "c", index: 0 }, value: 1 },
        },
      ],
    },
  ];

  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const afterMeasure = snapshots[2];
  const finalDistribution = distributionMap(quantum.measurement_distribution_for_ensemble(snapshots[3]));

  assert.deepEqual(
    afterMeasure.map((branch) => branch.classicalState?.[0]?.value).sort(),
    [0, 1],
  );
  assert.equal(Number((finalDistribution.get("00") ?? 0).toFixed(6)), 0.5);
  assert.equal(Number((finalDistribution.get("11") ?? 0).toFixed(6)), 0.5);
});

test("sampled runs persist the measured classical bit and RESET returns the wire to |0>", () => {
  const prepared = quantum.tensor_product_qubits([ketOne]);
  const columns = [
    { gates: [{ id: "m", gate: "M", wires: [0], writesClassicalBit: { register: "c", index: 0 } }] },
    { gates: [{ id: "reset", gate: "RESET", wires: [0] }] },
  ];

  const sampled = quantum.sample_circuit_run(prepared, columns, resolver, 1, () => 0.9);

  assert.equal(sampled.outcomes.length, 1);
  assert.deepEqual(sampled.outcomes[0].writesClassicalBit, { register: "c", index: 0 });
  assert.equal(sampled.finalClassicalState[0].value, 1);
  assert.equal(sampled.finalSample.basis, "0");
});

test("teleportation model exposes conditioned correction columns and structured classical layout", (t) => {
  const storage = new Map();
  global.window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  };
  t.after(() => {
    delete global.window;
  });

  const scope = effectScope();
  const model = scope.run(useTeleportationModel);
  t.after(() => scope.stop());

  const measureColumn = model.circuitColumns.value.find((column) => column.id === "measure");
  const corrZ = model.circuitColumns.value.find((column) => column.id === "corr-z");
  const corrX = model.circuitColumns.value.find((column) => column.id === "corr-x");

  assert.ok(measureColumn);
  assert.ok(corrZ);
  assert.ok(corrX);
  assert.deepEqual(
    measureColumn.gates.map((gate) => gate.writesClassicalBit),
    [
      { register: "teleport", index: 0 },
      { register: "teleport", index: 1 },
    ],
  );
  assert.equal(corrZ.gates[0].condition.kind, "bit-equals");
  assert.equal(corrX.gates[0].condition.kind, "bit-equals");
  assert.deepEqual(model.classicalLayout.value.lanes.map((lane) => lane.id), ["m0", "m1"]);
  assert.deepEqual(model.classicalLayout.value.registers.map((entry) => entry.label), ["m0", "m1"]);
  assert.deepEqual(model.classicalLayout.value.conditionBadges.map((entry) => entry.text), ["if m0", "if m1"]);
});
