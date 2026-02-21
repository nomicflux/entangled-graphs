const test = require("node:test");
const assert = require("node:assert/strict");

const quantum = require("../.tmp-test/quantum.js");
const actions = require("../.tmp-test/state/actions.js");
const selectors = require("../.tmp-test/state/selectors.js");
const stateOperators = require("../.tmp-test/state/operators.js");
const store = require("../.tmp-test/state/store.js");

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const clonePAdic = () => JSON.parse(JSON.stringify(store.state.pAdic));

const restorePAdic = (snapshot) => {
  store.state.pAdic.prime = snapshot.prime;
  store.state.pAdic.measurementModel = snapshot.measurementModel;
  store.state.pAdic.geometryMode = snapshot.geometryMode;
  store.state.pAdic.qubitCount = snapshot.qubitCount;
  store.state.pAdic.preparedQubits = snapshot.preparedQubits;
  store.state.pAdic.columns = snapshot.columns;
  store.state.pAdic.selectedGate = snapshot.selectedGate;
  store.state.pAdic.selectedStageIndex = snapshot.selectedStageIndex;
  store.state.pAdic.selectedBasis = snapshot.selectedBasis;
};

const approx = (left, right, tolerance = 1e-9) => Math.abs(left - right) <= tolerance;

test("p-adic stage visualization payload is deterministic and cache-keyed by mode/model/prime", () => {
  const prepared = quantum.p_adic_prepared_state_from_raw_qubits(
    [
      {
        localStates: [
          { value: 0, amplitude: { raw: "1" } },
          { value: 1, amplitude: { raw: "1" } },
          { value: 2, amplitude: { raw: "1" } },
        ],
      },
      {
        localStates: [
          { value: 0, amplitude: { raw: "1" } },
          { value: 1, amplitude: { raw: "2" } },
          { value: 2, amplitude: { raw: "3" } },
        ],
      },
    ],
    3,
  );

  const columns = [
    { gates: [{ id: "cx", gate: "CNOT", wires: [0, 1] }] },
    { gates: [{ id: "m", gate: "M", wires: [0] }] },
  ];

  const snapshots = quantum.simulate_padic_columns_ensemble(prepared, columns, resolver, 2, 3, "valuation_weight");

  const vectorA = quantum.p_adic_stage_visualizations_from_snapshots(snapshots, 3, "valuation_weight", "padic_vector");
  const vectorB = quantum.p_adic_stage_visualizations_from_snapshots(snapshots, 3, "valuation_weight", "padic_vector");
  assert.equal(vectorA, vectorB);
  assert.equal(vectorA[1], vectorB[1]);

  const ring = quantum.p_adic_stage_visualizations_from_snapshots(snapshots, 3, "valuation_weight", "valuation_ring");
  assert.notEqual(vectorA, ring);

  const ringByBasis = new Map(ring[1].nodes.map((node) => [node.basis, node]));
  let geometryChanged = false;
  for (const vectorNode of vectorA[1].nodes) {
    const ringNode = ringByBasis.get(vectorNode.basis);
    assert.ok(ringNode);
    if (!approx(vectorNode.point.x, ringNode.point.x) || !approx(vectorNode.point.y, ringNode.point.y)) {
      geometryChanged = true;
    }
  }
  assert.equal(geometryChanged, true);

  const primeFive = quantum.p_adic_stage_visualizations_from_snapshots(snapshots, 5, "valuation_weight", "padic_vector");
  assert.notEqual(vectorA, primeFive);
  const primeFiveByBasis = new Map(primeFive[1].nodes.map((node) => [node.basis, node]));
  let primeGeometryChanged = false;
  for (const vectorNode of vectorA[1].nodes) {
    const primeNode = primeFiveByBasis.get(vectorNode.basis);
    assert.ok(primeNode);
    if (!approx(primeNode.point.x, vectorNode.point.x) || !approx(primeNode.point.y, vectorNode.point.y)) {
      primeGeometryChanged = true;
    }
  }
  assert.equal(primeGeometryChanged, true);
});

test("p-adic visualization node metrics are normalized and valuation-consistent", () => {
  const prepared = quantum.p_adic_prepared_state_from_raw_qubits(
    [
      {
        localStates: [
          { value: 0, amplitude: { raw: "3" } },
          { value: 1, amplitude: { raw: "1" } },
        ],
      },
      {
        localStates: [
          { value: 0, amplitude: { raw: "1" } },
          { value: 1, amplitude: { raw: "1" } },
        ],
      },
    ],
    2,
  );

  const snapshots = quantum.simulate_padic_columns_ensemble(prepared, [{ gates: [] }], resolver, 2, 2, "character_based");
  const stages = quantum.p_adic_stage_visualizations_from_snapshots(snapshots, 2, "character_based", "padic_vector");

  assert.equal(stages[0].transitions.length, 0);
  assert.ok(stages[1].transitions.length > 0);

  for (const stage of stages) {
    const weightSum = stage.nodes.reduce((acc, node) => acc + node.weight, 0);
    assert.ok(approx(weightSum, 1));

    for (const node of stage.nodes) {
      assert.ok(node.residue >= 0 && node.residue < 2);
      assert.ok(node.digits.every((digit) => digit >= 0 && digit < 2));

      if (node.rawWeight === 0) {
        assert.equal(node.valuation, Number.POSITIVE_INFINITY);
        assert.equal(node.norm, 0);
      } else {
        const expectedNorm = Math.pow(2, -node.valuation);
        assert.ok(approx(node.norm, expectedNorm, 1e-6));
      }
    }
  }
});

test("p-adic selected basis is qubit-width validated and selector-backed", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(2);
    actions.setPAdicPrime(3);
    actions.applyPAdicPreset(0, "balanced");
    actions.applyPAdicPreset(1, "balanced");
    actions.setPAdicSelectedStage(0);
    actions.setPAdicSelectedBasis("22");

    assert.equal(store.state.pAdic.selectedBasis, "22");
    assert.ok(selectors.pAdicSelectedBasisNode.value);
    assert.equal(selectors.pAdicSelectedBasisNode.value.basis, "22");

    actions.setPAdicSelectedBasis("29");
    assert.equal(store.state.pAdic.selectedBasis, "22");

    actions.setPAdicQubitCount(1);
    assert.equal(store.state.pAdic.selectedBasis, null);
    assert.equal(selectors.pAdicSelectedBasisNode.value, null);
  } finally {
    restorePAdic(original);
  }
});
