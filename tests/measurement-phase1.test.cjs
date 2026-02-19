const test = require("node:test");
const assert = require("node:assert/strict");

const actions = require("../.tmp-test/state/actions.js");
const placements = require("../.tmp-test/state/placements.js");
const store = require("../.tmp-test/state/store.js");

const cloneColumns = (columns) =>
  columns.map((column) => ({
    gates: column.gates.map((gate) => ({
      id: gate.id,
      gate: gate.gate,
      wires: [...gate.wires],
    })),
  }));

const cloneBloch = (preparedBloch) => preparedBloch.map((entry) => ({ ...entry }));

test("single-wire placement is blocked after row measurement", () => {
  const originalColumns = cloneColumns(store.state.columns);
  const originalBloch = cloneBloch(store.state.preparedBloch);

  try {
    store.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    store.state.columns = [
      { gates: [{ id: "m-0", gate: "M", wires: [0] }] },
      { gates: [] },
    ];

    assert.equal(placements.toSingleGatePlacement(1, 0, "X"), null);
    assert.notEqual(placements.toSingleGatePlacement(1, 1, "X"), null);
  } finally {
    store.state.columns = originalColumns;
    store.state.preparedBloch = originalBloch;
  }
});

test("placing M auto-deletes later gates on that row and disallows second M", () => {
  const originalColumns = cloneColumns(store.state.columns);
  const originalBloch = cloneBloch(store.state.preparedBloch);

  try {
    store.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    store.state.columns = [
      { gates: [] },
      {
        gates: [
          { id: "x-later", gate: "X", wires: [0] },
          { id: "h-keep", gate: "H", wires: [1] },
        ],
      },
      { gates: [] },
    ];

    const measurementPlacement = placements.toSingleGatePlacement(0, 0, "M");
    assert.notEqual(measurementPlacement, null);
    actions.setGateAt(measurementPlacement);

    assert.deepEqual(
      store.state.columns[1].gates.map((gate) => ({ gate: gate.gate, wires: [...gate.wires] })),
      [{ gate: "H", wires: [1] }],
    );
    assert.equal(placements.toSingleGatePlacement(2, 0, "M"), null);
    assert.equal(placements.toCnotPlacement(2, 0, 1), null);
  } finally {
    store.state.columns = originalColumns;
    store.state.preparedBloch = originalBloch;
  }
});
