const test = require("node:test");
const assert = require("node:assert/strict");

const layout = require("../.tmp-test/components/circuit/quantum-register-layout.js");
const entanglement = require("../.tmp-test/components/circuit/entanglement-geometry.js");

test("quantum register layout derives stable row geometry from the register definition", () => {
  assert.equal(layout.CIRCUIT_ROW_HEIGHT_PX, 56);
  assert.equal(layout.quantumRegisterHeight(3), 168);
  assert.equal(layout.quantumRowTopY(2), 112);
  assert.equal(layout.quantumRowCenterY(0), 28);
  assert.equal(layout.quantumRowCenterY(2), 140);
  assert.equal(layout.quantumRowBottomY(2), 168);
  assert.equal(layout.quantumGridTemplateRows(3), "repeat(3, 56px)");
  assert.deepEqual(layout.quantumRegisterStyleVars(3), {
    "--circuit-row-height": "56px",
    "--circuit-row-count": "3",
    "--circuit-quantum-height": "168px",
  });
});

test("entanglement geometry follows row relationships instead of container percentages", () => {
  const path = entanglement.pairwiseEntanglementArcPath({ fromRow: 1, toRow: 2, strength: 0.5 });

  assert.match(path, /M 24 84 /);
  assert.match(path, / 24 140$/);
  assert.equal(entanglement.multipartiteBandTopY(1), 62);
  assert.equal(entanglement.multipartiteBandBottomY(2), 162);
});
