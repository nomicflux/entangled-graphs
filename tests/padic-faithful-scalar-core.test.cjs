const test = require("node:test");
const assert = require("node:assert/strict");

const faithful = require("../.tmp-test/padic-faithful/index.js");

test("p-adic scalar core normalizes rational inputs and preserves exact arithmetic", () => {
  const left = faithful.pAdicScalarFromFraction(6n, -8n);
  const right = faithful.pAdicScalarFromFraction(5n, 12n);

  assert.equal(left.numerator, -3n);
  assert.equal(left.denominator, 4n);
  assert.equal(faithful.pAdicScalarToString(left), "-3/4");

  const sum = faithful.addPAdicScalars(left, right);
  const difference = faithful.subtractPAdicScalars(left, right);
  const product = faithful.multiplyPAdicScalars(left, right);
  const quotient = faithful.dividePAdicScalars(left, right);

  assert.equal(faithful.pAdicScalarToString(sum), "-1/3");
  assert.equal(faithful.pAdicScalarToString(difference), "-7/6");
  assert.equal(faithful.pAdicScalarToString(product), "-5/16");
  assert.equal(faithful.pAdicScalarToString(quotient), "-9/5");
  assert.equal(
    faithful.equalPAdicScalars(
      faithful.pAdicScalarFromFraction(2n, 4n),
      faithful.pAdicScalarFromFraction(1n, 2n),
    ),
    true,
  );
});

test("p-adic scalar valuation and norm exponent follow exact prime-factor arithmetic", () => {
  const x = faithful.pAdicScalarFromFraction(45n, 14n);
  assert.equal(faithful.pAdicValuationOfScalar(x, 3), 2);
  assert.equal(faithful.pAdicNormExponentOfScalar(x, 3), -2);

  const y = faithful.pAdicScalarFromFraction(2n, 9n);
  assert.equal(faithful.pAdicValuationOfScalar(y, 3), -2);
  assert.equal(faithful.pAdicNormExponentOfScalar(y, 3), 2);

  const zero = faithful.pAdicScalarFromFraction(0n, 7n);
  assert.equal(faithful.isZeroPAdicScalar(zero), true);
  assert.equal(faithful.pAdicValuationOfScalar(zero, 5), Number.POSITIVE_INFINITY);
  assert.equal(faithful.pAdicNormExponentOfScalar(zero, 5), Number.POSITIVE_INFINITY);
});

test("p-adic scalar unit residue is computed after valuation normalization", () => {
  const x = faithful.pAdicScalarFromFraction(45n, 14n);
  const y = faithful.pAdicScalarFromFraction(2n, 9n);
  const z = faithful.pAdicScalarFromFraction(-1n, 2n);

  assert.equal(faithful.pAdicUnitResidueOfScalar(x, 3), 1);
  assert.equal(faithful.pAdicUnitResidueOfScalar(y, 3), 2);
  assert.equal(faithful.pAdicUnitResidueOfScalar(z, 5), 2);
  assert.equal(
    faithful.pAdicUnitResidueOfScalar(faithful.pAdicScalarFromFraction(0n, 1n), 5),
    null,
  );
});

test("p-adic scalar core rejects invalid fractions and division by zero", () => {
  assert.throws(
    () => faithful.pAdicScalarFromFraction(1.5, 1),
    /must be an integer/i,
  );

  assert.throws(
    () => faithful.pAdicScalarFromFraction(1n, 0n),
    /cannot be zero/i,
  );

  assert.throws(
    () =>
      faithful.dividePAdicScalars(
        faithful.pAdicScalarFromFraction(1n, 1n),
        faithful.pAdicScalarFromFraction(0n, 1n),
      ),
    /divide by zero/i,
  );
});
