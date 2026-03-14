const test = require("node:test");
const assert = require("node:assert/strict");

const blochGeometry = require("../.tmp-test/components/bloch-geometry.js");

const approx = (actual, expected, epsilon = 1e-4) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

test("cardinal Bloch vectors project to stable 3d screen positions", () => {
  const north = blochGeometry.projectBlochVector({ x: 0, y: 0, z: 1 }, 1);
  const south = blochGeometry.projectBlochVector({ x: 0, y: 0, z: -1 }, 1);
  const plusX = blochGeometry.projectBlochVector({ x: 1, y: 0, z: 0 }, 1);
  const minusX = blochGeometry.projectBlochVector({ x: -1, y: 0, z: 0 }, 1);
  const plusY = blochGeometry.projectBlochVector({ x: 0, y: 1, z: 0 }, 1);
  const minusY = blochGeometry.projectBlochVector({ x: 0, y: -1, z: 0 }, 1);

  approx(north.x, 0);
  approx(north.y, -0.8669);
  approx(north.depth, -0.3827);
  approx(south.x, 0);
  approx(south.y, 0.9889);
  approx(south.depth, 0.3827);

  approx(plusX.x, 0.8429);
  approx(plusX.y, 0.1553);
  approx(plusX.depth, -0.4009);
  approx(minusX.x, -0.9676);
  approx(minusX.y, -0.1783);
  approx(minusX.depth, 0.4009);

  approx(plusY.x, 0.5063);
  approx(plusY.y, -0.4023);
  approx(plusY.depth, 0.8324);
  approx(minusY.x, -0.3796);
  approx(minusY.y, 0.3016);
  approx(minusY.depth, -0.8324);
});

test("equatorial rotation advances screen position and depth in the projected direction", () => {
  const phi45 = blochGeometry.projectBlochVector(blochGeometry.blochAnglesToVector(Math.PI / 2, Math.PI / 4), 1);
  const phi135 = blochGeometry.projectBlochVector(blochGeometry.blochAnglesToVector(Math.PI / 2, (3 * Math.PI) / 4), 1);

  approx(phi45.x, 0.9961);
  approx(phi45.y, -0.1334);
  approx(phi45.depth, 0.3051);
  approx(phi135.x, -0.3885);
  approx(phi135.y, -0.4249);
  approx(phi135.depth, 0.8720);

  assert.ok(phi45.x > phi135.x);
  assert.ok(phi135.depth > phi45.depth);
});
