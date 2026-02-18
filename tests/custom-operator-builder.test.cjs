const test = require("node:test");
const assert = require("node:assert/strict");

const complex = require("../.tmp-test/complex.js");
const operator = require("../.tmp-test/operator.js");
const builder = require("../.tmp-test/state/custom-operator-builder.js");
const actions = require("../.tmp-test/state/actions.js");
const store = require("../.tmp-test/state/store.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const identityEntries = operator.singleQubitMatrix(
  complex.from_real(1),
  complex.from_real(0),
  complex.from_real(0),
  complex.from_real(1),
);

test("builder options include only single-qubit custom operators", () => {
  const customSingle = operator.makeSingleQubitOperator("custom-1q", "U1", identityEntries);
  const customTwoQ = operator.blockMatrix2x2("custom-2q", "U2", [[operator.I, operator.X], [operator.X, operator.I]]);

  const options = builder.singleQubitBuilderOptions([customSingle, customTwoQ]);

  assert.deepEqual(options.map((entry) => entry.gate), ["I", "X", "H", "S", "custom-1q"]);
});

test("block selection resolves to ordered 2x2 operator blocks", () => {
  const customSingle = operator.makeSingleQubitOperator("custom-a", "Ua", identityEntries);
  const blocks = builder.resolveBlock2x2Selection(
    {
      topLeft: "I",
      topRight: "X",
      bottomLeft: "custom-a",
      bottomRight: "S",
    },
    [customSingle],
  );

  assert.ok(blocks);
  assert.equal(blocks[0][0].id, "I");
  assert.equal(blocks[0][1].id, "X");
  assert.equal(blocks[1][0].id, "custom-a");
  assert.equal(blocks[1][1].id, "S");
});

test("resolved block selection can be persisted as a custom multi-qubit operator", () => {
  const originalCustomOperators = [...store.state.customOperators];

  try {
    const blocks = builder.resolveBlock2x2Selection(
      {
        topLeft: "I",
        topRight: "X",
        bottomLeft: "X",
        bottomRight: "I",
      },
      store.state.customOperators,
    );

    assert.ok(blocks);
    const createdId = actions.createCustomBlockOperator("UIX", blocks);
    const created = stateOperators.resolveOperator(createdId, store.state.customOperators);

    assert.ok(created);
    assert.equal(created.id, createdId);
    assert.equal(created.qubitArity, 2);
    assert.equal(created.matrix.length, 4);
    assert.equal(created.matrix[0].length, 4);
  } finally {
    store.state.customOperators = originalCustomOperators;
  }
});
