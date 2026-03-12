const test = require("node:test");
const assert = require("node:assert/strict");
const { computed, effectScope } = require("vue");

const complex = require("../.tmp-test/complex.js");
const { tensor_product_qubits } = require("../.tmp-test/quantum.js");
const lessonSpec = require("../.tmp-test/components/error-codes/shared/lesson-spec.js");
const { useErrorCodeLessonModel } = require("../.tmp-test/components/error-codes/shared/useErrorCodeLessonModel.js");

const ZERO_QUBIT = {
  a: complex.from_real(1),
  b: complex.from_real(0),
};

const EMPTY_COLUMN = { gates: [] };

const STEANE_SUPPORTS = [
  [0, 2, 4, 6],
  [1, 2, 5, 6],
  [3, 4, 5, 6],
];

const createCheckFamily = (basis, checkCount = STEANE_SUPPORTS.length) => ({
  id: `${basis.toLowerCase()}-family`,
  basis,
  dataRows: [0, 1, 2, 3, 4, 5, 6],
  checks: STEANE_SUPPORTS.slice(0, checkCount).map((supportRows, index) => ({
    id: `${basis.toLowerCase()}-check-${index + 1}`,
    syndromeRow: 7 + index,
    supportRows,
  })),
});

const createPreparedState = (qubitCount) =>
  computed(() =>
    tensor_product_qubits(Array.from({ length: qubitCount }, () => ZERO_QUBIT)),
  );

test("parity-family visible columns preserve the 3-by-7 Hamming lane geometry", () => {
  const visibleColumns = lessonSpec.visibleColumnsFromLessonSteps([
    {
      id: "z-checks",
      kind: "check-family",
      family: createCheckFamily("Z"),
      executionColumns: [EMPTY_COLUMN, EMPTY_COLUMN],
    },
  ]);

  assert.equal(visibleColumns.length, 1);
  assert.equal(visibleColumns[0].kind, "parity-family");
  assert.equal(visibleColumns[0].basis, "Z");
  assert.deepEqual(
    visibleColumns[0].lanes.map((lane) => ({
      laneIndex: lane.laneIndex,
      syndromeRow: lane.syndromeRow,
      supportRows: [...lane.supportRows],
    })),
    [
      { laneIndex: 0, syndromeRow: 7, supportRows: [0, 2, 4, 6] },
      { laneIndex: 1, syndromeRow: 8, supportRows: [1, 2, 5, 6] },
      { laneIndex: 2, syndromeRow: 9, supportRows: [3, 4, 5, 6] },
    ],
  );
});

test("parity-family geometry stays the same when only the basis changes", () => {
  const zVisible = lessonSpec.visibleColumnsFromLessonSteps([
    {
      id: "z-checks",
      kind: "check-family",
      family: createCheckFamily("Z"),
      executionColumns: [EMPTY_COLUMN],
    },
  ]);
  const xVisible = lessonSpec.visibleColumnsFromLessonSteps([
    {
      id: "x-checks",
      kind: "check-family",
      family: createCheckFamily("X"),
      executionColumns: [EMPTY_COLUMN],
    },
  ]);

  assert.equal(zVisible[0].kind, "parity-family");
  assert.equal(xVisible[0].kind, "parity-family");
  assert.equal(zVisible[0].basis, "Z");
  assert.equal(xVisible[0].basis, "X");
  assert.deepEqual(
    zVisible[0].lanes.map((lane) => ({ syndromeRow: lane.syndromeRow, supportRows: [...lane.supportRows] })),
    xVisible[0].lanes.map((lane) => ({ syndromeRow: lane.syndromeRow, supportRows: [...lane.supportRows] })),
  );
});

test("parity-family derivation splits families larger than three checks into multiple visible columns", () => {
  const visibleColumns = lessonSpec.visibleColumnsFromLessonSteps([
    {
      id: "four-check-family",
      kind: "check-family",
      family: {
        ...createCheckFamily("Z"),
        checks: [
          ...createCheckFamily("Z").checks,
          {
            id: "z-check-4",
            syndromeRow: 10,
            supportRows: [0, 1, 3, 6],
          },
        ],
      },
      executionColumns: [EMPTY_COLUMN, EMPTY_COLUMN, EMPTY_COLUMN],
    },
  ]);

  assert.equal(visibleColumns.length, 2);
  assert.equal(visibleColumns[0].kind, "parity-family");
  assert.equal(visibleColumns[1].kind, "parity-family");
  assert.equal(visibleColumns[0].lanes.length, 3);
  assert.equal(visibleColumns[1].lanes.length, 1);
});

test("shared lesson model exposes stages at visible lesson boundaries, not lowered execution columns", (t) => {
  const scope = effectScope();
  const model = scope.run(() =>
    useErrorCodeLessonModel({
      qubitCount: 10,
      rowSpecs: computed(() =>
        Array.from({ length: 10 }, (_, row) => ({
          row,
          role: row <= 6 ? "data" : "syndrome",
        })),
      ),
      allowedErrorGates: ["X"],
      defaultSelectedGate: "X",
      preparedState: createPreparedState(10),
      lessonSteps: computed(() => [
        {
          id: "encode",
          kind: "primitive-columns",
          executionColumns: [EMPTY_COLUMN],
        },
        {
          id: "z-checks",
          kind: "check-family",
          family: createCheckFamily("Z"),
          executionColumns: [EMPTY_COLUMN, EMPTY_COLUMN],
        },
      ]),
      columnLabels: computed(() => ["Encode", "Checks"]),
      stageLabels: computed(() => ["Start", "After encode", "After checks"]),
      gateIdPrefix: "lesson-test",
    }),
  );

  t.after(() => scope.stop());

  assert.equal(model.visibleColumns.value.length, 2);
  assert.equal(model.columns.value.length, 2);
  assert.deepEqual(model.visibleColumns.value.map((column) => column.kind), ["primitive", "parity-family"]);
  assert.equal(model.stageSnapshots.value.length, 3);
  assert.deepEqual(model.stageSnapshots.value.map((stage) => stage.index), [0, 1, 2]);
});

