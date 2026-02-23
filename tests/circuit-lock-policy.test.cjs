const test = require("node:test");
const assert = require("node:assert/strict");
const { ref } = require("vue");

const store = require("../.tmp-test/state/store.js");
const actions = require("../.tmp-test/state/actions.js");
const placementHandlersModule = require("../.tmp-test/components/circuit/useCircuitGridPlacementHandlers.js");
const dragHandlersModule = require("../.tmp-test/components/circuit/useCircuitGridDragHandlers.js");
const modelContextModule = require("../.tmp-test/components/circuit/model-context.js");

const cloneColumns = (columns) =>
  columns.map((column) => ({
    gates: column.gates.map((gate) => ({
      id: gate.id,
      gate: gate.gate,
      wires: [...gate.wires],
    })),
  }));

const cloneBloch = (preparedBloch) => preparedBloch.map((entry) => ({ ...entry }));

const gateArity = (gate) => {
  if (gate === "CNOT") {
    return 2;
  }
  if (gate === "TOFFOLI") {
    return 3;
  }
  return 1;
};

const lockReason = "Locked core gate. This column is not editable.";
const isLockedCell = (column) => column === 0;

const makePlacementHandlers = (pendingPlacement, placementError) =>
  placementHandlersModule.useCircuitGridPlacementHandlers({
    ...modelContextModule.createFreeFormGridModelContext(),
    pendingPlacement,
    placementError,
    gateArity,
    firstMeasurementColumnAtRow: () => null,
    clearPendingPlacement: () => {
      pendingPlacement.value = null;
      placementError.value = null;
    },
    isCellLockedAt: isLockedCell,
    lockReasonForCell: () => lockReason,
    qubitCount: () => store.state.preparedBloch.length,
    selectedGate: () => store.state.selectedGate,
  });

const makeDragHandlers = (dragging, dropTarget, placementError) =>
  dragHandlersModule.useCircuitGridDragHandlers({
    ...modelContextModule.createFreeFormGridModelContext(),
    dragging,
    dropTarget,
    placementError,
    gateArity,
    firstMeasurementColumnAtRow: () => null,
    clearPendingPlacement: () => {},
    isCellLockedAt: isLockedCell,
    lockReasonForCell: () => lockReason,
  });

test("lock policy blocks placement and Alt-clear on locked core cells", () => {
  const originalColumns = cloneColumns(store.state.columns);
  const originalBloch = cloneBloch(store.state.preparedBloch);
  const originalSelectedGate = store.state.selectedGate;

  try {
    store.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    store.state.columns = [
      { gates: [{ id: "locked-x", gate: "X", wires: [0] }] },
      { gates: [] },
    ];
    actions.setSelectedGate("H");

    const pendingPlacement = ref(null);
    const placementError = ref(null);
    const handlers = makePlacementHandlers(pendingPlacement, placementError);

    handlers.handleSlotClick(0, 0, { altKey: false });
    assert.equal(store.state.columns[0].gates.length, 1);
    assert.match(placementError.value, /Locked core gate/);

    placementError.value = null;
    handlers.handleSlotClick(0, 0, { altKey: true });
    assert.equal(store.state.columns[0].gates.length, 1);
    assert.match(placementError.value, /Locked core gate/);

    placementError.value = null;
    handlers.handleSlotClick(1, 0, { altKey: false });
    assert.equal(
      store.state.columns[1].gates.some((gate) => gate.gate === "H" && gate.wires[0] === 0),
      true,
    );
    assert.equal(placementError.value, null);
  } finally {
    store.state.columns = originalColumns;
    store.state.preparedBloch = originalBloch;
    store.state.selectedGate = originalSelectedGate;
  }
});

test("lock policy blocks dragging a gate from a locked core cell", () => {
  const originalColumns = cloneColumns(store.state.columns);
  const originalBloch = cloneBloch(store.state.preparedBloch);

  try {
    store.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    store.state.columns = [
      { gates: [{ id: "locked-x", gate: "X", wires: [0] }] },
      { gates: [] },
    ];

    const dragging = ref(null);
    const dropTarget = ref(null);
    const placementError = ref(null);
    const handlers = makeDragHandlers(dragging, dropTarget, placementError);

    handlers.startCellDrag(store.state.columns, 0, 0, {
      preventDefault: () => {},
      dataTransfer: { setData: () => {} },
    });

    assert.equal(dragging.value, null);
    assert.match(placementError.value, /Locked core gate/);
  } finally {
    store.state.columns = originalColumns;
    store.state.preparedBloch = originalBloch;
  }
});

test("lock policy blocks dropping into locked core cells", () => {
  const originalColumns = cloneColumns(store.state.columns);
  const originalBloch = cloneBloch(store.state.preparedBloch);
  const originalSelectedGate = store.state.selectedGate;

  try {
    store.state.preparedBloch = [{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }];
    store.state.columns = [
      { gates: [] },
      { gates: [{ id: "move-h", gate: "H", wires: [0] }] },
    ];

    const dragging = ref(null);
    const dropTarget = ref(null);
    const placementError = ref(null);
    const handlers = makeDragHandlers(dragging, dropTarget, placementError);

    handlers.startCellDrag(store.state.columns, 1, 0, {
      preventDefault: () => {},
      dataTransfer: { setData: () => {} },
    });
    assert.notEqual(dragging.value, null);

    handlers.handleDrop(0, 0);

    assert.equal(store.state.columns[0].gates.length, 0);
    assert.equal(store.state.columns[1].gates.length, 1);
    assert.match(placementError.value, /Locked core gate/);
  } finally {
    store.state.columns = originalColumns;
    store.state.preparedBloch = originalBloch;
    store.state.selectedGate = originalSelectedGate;
  }
});
