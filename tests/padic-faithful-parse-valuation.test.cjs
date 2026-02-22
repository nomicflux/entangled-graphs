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

test("p-adic digit expansion can be computed from exact scalar values", () => {
  const twoThirds = faithful.pAdicScalarFromFraction(2n, 3n);
  const half = faithful.pAdicScalarFromFraction(1n, 2n);

  const finite = faithful.pAdicDigitsFromScalar(twoThirds, 3, 6);
  assert.deepEqual(finite.digits, [2]);
  assert.equal(finite.truncated, false);
  assert.equal(finite.text, "2");

  const periodic = faithful.pAdicDigitsFromScalar(half, 3, 5);
  assert.deepEqual(periodic.digits.slice(0, 3), [2, 1, 1]);
  assert.equal(periodic.truncated, true);
  assert.match(periodic.text, /\.\.\.$/);
});
