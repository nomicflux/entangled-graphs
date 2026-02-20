const test = require("node:test");
const assert = require("node:assert/strict");

const actions = require("../.tmp-test/state/actions.js");
const store = require("../.tmp-test/state/store.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const clonePAdic = () => JSON.parse(JSON.stringify(store.state.pAdic));

const restorePAdic = (snapshot) => {
  store.state.pAdic.prime = snapshot.prime;
  store.state.pAdic.measurementModel = snapshot.measurementModel;
  store.state.pAdic.qubitCount = snapshot.qubitCount;
  store.state.pAdic.preparedQubits = snapshot.preparedQubits;
  store.state.pAdic.columns = snapshot.columns;
  store.state.pAdic.selectedGate = snapshot.selectedGate;
  store.state.pAdic.selectedStageIndex = snapshot.selectedStageIndex;
};

test("p-adic gate palette excludes unsupported builtins", () => {
  assert.deepEqual(stateOperators.availablePAdicBuiltinGatesForQubitCount(1), ["I", "X", "Z", "M"]);
  assert.deepEqual(stateOperators.availablePAdicBuiltinGatesForQubitCount(2), ["I", "X", "Z", "M", "CNOT", "SWAP"]);
  assert.deepEqual(stateOperators.availablePAdicBuiltinGatesForQubitCount(3), ["I", "X", "Z", "M", "CNOT", "SWAP", "TOFFOLI", "CSWAP"]);
});

test("p-adic measurement gate locks later columns on measured row", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(2);
    store.state.pAdic.columns = [{ gates: [] }, { gates: [] }];

    assert.equal(actions.setPAdicGateAt(0, 0, "M"), true);
    assert.equal(actions.setPAdicGateAt(1, 0, "X"), false);
    assert.equal(actions.setPAdicGateAt(1, 1, "X"), true);

    const secondColumn = store.state.pAdic.columns[1].gates.map((gate) => ({ gate: gate.gate, wires: [...gate.wires] }));
    assert.deepEqual(secondColumn, [{ gate: "X", wires: [1] }]);
  } finally {
    restorePAdic(original);
  }
});

test("p-adic staged multi-wire placements validate wire uniqueness", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(3);
    store.state.pAdic.columns = [{ gates: [] }];

    assert.equal(actions.placePAdicCnot(0, 0, 1), true);
    assert.equal(actions.placePAdicCnot(0, 1, 1), false);

    store.state.pAdic.columns = [{ gates: [] }];
    assert.equal(actions.placePAdicToffoli(0, 0, 1, 2), true);
    assert.equal(actions.placePAdicToffoli(0, 0, 1, 1), false);
  } finally {
    restorePAdic(original);
  }
});

test("p-adic selected gate rejects unavailable builtins", () => {
  const original = clonePAdic();

  try {
    actions.setPAdicQubitCount(2);
    actions.setSelectedPAdicGate("X");
    assert.equal(store.state.pAdic.selectedGate, "X");

    actions.setSelectedPAdicGate("H");
    assert.equal(store.state.pAdic.selectedGate, "X");
  } finally {
    restorePAdic(original);
  }
});
