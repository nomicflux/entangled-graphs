const test = require("node:test");
const assert = require("node:assert/strict");

const faithful = require("../.tmp-test/padic-faithful/index.js");

test("parsePAdicScalarRaw preserves exact fractional p-adic expressions", () => {
  const x = faithful.parsePAdicScalarRaw("1-p^-1", 3);
  assert.equal(faithful.pAdicScalarToString(x), "2/3");
  assert.equal(faithful.pAdicValuationOfScalar(x, 3), -1);
  assert.equal(faithful.pAdicUnitResidueOfScalar(x, 3), 2);

  const y = faithful.parsePAdicScalarRaw("p^-2+2p^-1+1", 3);
  assert.equal(faithful.pAdicScalarToString(y), "16/9");
  assert.equal(faithful.pAdicValuationOfScalar(y, 3), -2);
  assert.equal(faithful.pAdicUnitResidueOfScalar(y, 3), 1);
});

test("parsePAdicRaw numeric projection remains consistent with exact scalar parse", () => {
  const scalar = faithful.parsePAdicScalarRaw("5/7-p^-1", 3);
  const projected = faithful.parsePAdicRaw("5/7-p^-1", 3);
  assert.equal(projected, faithful.pAdicScalarToNumber(scalar));
});
