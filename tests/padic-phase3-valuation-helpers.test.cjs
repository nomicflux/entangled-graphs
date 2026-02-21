const test = require("node:test");
const assert = require("node:assert/strict");

const padic = require("../.tmp-test/quantum/padic.js");

test("p-adic raw parser handles valuation forms", () => {
  assert.equal(padic.parse_p_adic_raw("p", 3), 3);
  assert.equal(padic.parse_p_adic_raw("p^2", 3), 9);
  assert.equal(padic.parse_p_adic_raw("p^-1", 2), 0.5);
  assert.equal(padic.parse_p_adic_raw("-p^3", 5), -125);
  assert.equal(padic.parse_p_adic_raw("2p^2 + 1", 3), 19);
});

test("p-adic valuation and norm helpers align for parsed values", () => {
  const value = padic.parse_p_adic_raw("p^-2", 2);
  assert.equal(value, 0.25);

  const valuation = padic.p_adic_valuation_from_raw("p^-2", 2);
  assert.equal(valuation, -2);

  const norm = padic.p_adic_norm_from_real(value, 2);
  assert.equal(norm, 4);

  assert.equal(padic.p_adic_valuation_from_raw("0", 3), Number.POSITIVE_INFINITY);
  assert.equal(padic.p_adic_norm_from_real(0, 3), 0);
});
