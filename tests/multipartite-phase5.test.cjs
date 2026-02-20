const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const quantum = require("../.tmp-test/quantum.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const ketZero = { a: complex.from_real(1), b: complex.from_real(0) };

const rowsOnly = (components) => components.map((entry) => entry.rows);

test("entanglement link/model helpers reuse cached results for unchanged ensemble", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h0", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx01", gate: "CNOT", wires: [0, 1] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 2);
  const ensemble = snapshots[snapshots.length - 1];

  const firstLinks = quantum.entanglement_links_from_ensemble(ensemble);
  const secondLinks = quantum.entanglement_links_from_ensemble(ensemble);
  assert.strictEqual(firstLinks, secondLinks);

  const firstModel = quantum.entanglement_model_from_ensemble(ensemble);
  const secondModel = quantum.entanglement_model_from_ensemble(ensemble);
  assert.strictEqual(firstModel, secondModel);
});

test("free-form five-qubit example keeps disjoint components separate", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h0", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx01", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "cx02", gate: "CNOT", wires: [0, 2] }] },
    { gates: [{ id: "h3", gate: "H", wires: [3] }] },
    { gates: [{ id: "cx34", gate: "CNOT", wires: [3, 4] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 5);
  const model = quantum.entanglement_model_from_ensemble(snapshots[snapshots.length - 1]);

  assert.deepEqual(rowsOnly(model.components), [[0, 1, 2], [3, 4]]);
  assert.deepEqual(
    model.components.map((entry) => entry.kind),
    ["multipartite", "pairwise"],
  );
});

test("measurement branch behavior removes multipartite component at measured stage", () => {
  const prepared = quantum.tensor_product_qubits([ketZero, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "h0", gate: "H", wires: [0] }] },
    { gates: [{ id: "cx01", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "cx02", gate: "CNOT", wires: [0, 2] }] },
    { gates: [{ id: "m0", gate: "M", wires: [0] }] },
  ];
  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 3);
  const stageModels = quantum.stage_entanglement_models_from_snapshots(snapshots);

  assert.deepEqual(rowsOnly(stageModels[3].components), [[0, 1, 2]]);
  assert.deepEqual(rowsOnly(stageModels[4].components), [[0], [1], [2]]);
});

test("teleportation backbone keeps stage model count aligned with stage snapshots", () => {
  const invSqrt2 = 1 / Math.sqrt(2);
  const sourcePlus = { a: complex.from_real(invSqrt2), b: complex.from_real(invSqrt2) };
  const prepared = quantum.tensor_product_qubits([sourcePlus, ketZero, ketZero]);
  const columns = [
    { gates: [{ id: "bell-h-gate", gate: "H", wires: [1] }] },
    { gates: [{ id: "bell-cnot-gate", gate: "CNOT", wires: [1, 2] }] },
    { gates: [{ id: "alice-cnot-gate", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "alice-h-gate", gate: "H", wires: [0] }] },
    {
      gates: [
        { id: "measure-q0", gate: "M", wires: [0] },
        { id: "measure-q1", gate: "M", wires: [1] },
      ],
    },
    { gates: [] },
    { gates: [] },
  ];

  const snapshots = quantum.simulate_columns_ensemble(prepared, columns, resolver, 3);
  const models = quantum.stage_entanglement_models_from_snapshots(snapshots);
  assert.equal(models.length, snapshots.length);
});
