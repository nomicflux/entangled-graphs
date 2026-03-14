const test = require("node:test");
const assert = require("node:assert/strict");

const lobes = require("../.tmp-test/components/bloch-probability-lobes.js");

const approx = (actual, expected, epsilon = 1e-4) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

test("probability lobe layout scales dominant interior volume with p0 and p1", () => {
  const zeroHeavy = lobes.deriveProbabilityLobeLayout(1, 0, 34, "md");
  const balanced = lobes.deriveProbabilityLobeLayout(0.5, 0.5, 34, "md");
  const oneHeavy = lobes.deriveProbabilityLobeLayout(0.2, 0.8, 34, "md");

  assert.ok(zeroHeavy.zero.rx > zeroHeavy.one.rx);
  assert.ok(zeroHeavy.zero.ry > zeroHeavy.one.ry);
  approx(balanced.zero.rx, balanced.one.rx);
  approx(balanced.zero.ry, balanced.one.ry);
  assert.ok(oneHeavy.one.rx > oneHeavy.zero.rx);
  assert.ok(oneHeavy.one.ry > oneHeavy.zero.ry);
});

test("probability lobe layout keeps left and right basis anchors fixed", () => {
  const first = lobes.deriveProbabilityLobeLayout(0.15, 0.85, 26, "sm");
  const second = lobes.deriveProbabilityLobeLayout(0.9, 0.1, 26, "sm");

  assert.ok(first.zero.cx < 0);
  assert.ok(first.one.cx > 0);
  assert.equal(first.anchors.leftX, second.anchors.leftX);
  assert.equal(first.anchors.rightX, second.anchors.rightX);
  assert.equal(first.anchors.y, second.anchors.y);
});

test("probability lobe layout preserves normalized proportions across sm and md sizes", () => {
  const sm = lobes.deriveProbabilityLobeLayout(0.65, 0.35, 26, "sm");
  const md = lobes.deriveProbabilityLobeLayout(0.65, 0.35, 34, "md");

  approx(sm.zero.rx / 26, md.zero.rx / 34, 0.03);
  approx(sm.one.ry / 26, md.one.ry / 34, 0.03);
  approx(sm.anchors.leftX / 26, md.anchors.leftX / 34, 0.03);
});
