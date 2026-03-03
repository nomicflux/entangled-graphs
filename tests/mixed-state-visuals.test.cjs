const test = require("node:test");
const assert = require("node:assert/strict");
const complex = require("../.tmp-test/complex.js");
const density = require("../.tmp-test/quantum/density.js");
const visuals = require("../.tmp-test/components/mixed-state/density-stage-visual-model.js");

const bellStateDensity = () => {
  const amplitude = complex.complex(Math.SQRT1_2, 0);
  return [
    [complex.complex(0.5, 0), complex.complex(0, 0), complex.complex(0, 0), complex.complex(0.5, 0)],
    [complex.complex(0, 0), complex.complex(0, 0), complex.complex(0, 0), complex.complex(0, 0)],
    [complex.complex(0, 0), complex.complex(0, 0), complex.complex(0, 0), complex.complex(0, 0)],
    [complex.complex(0.5, 0), complex.complex(0, 0), complex.complex(0, 0), complex.complex(0.5, 0)],
  ];
};

test("density clouds distinguish coherence phase even when populations match", () => {
  const plus = density.singleQubitDensityMatrix({ rho00: 0.5, rho11: 0.5, rho01: complex.complex(0.5, 0) });
  const plusI = density.singleQubitDensityMatrix({ rho00: 0.5, rho11: 0.5, rho01: complex.complex(0, -0.5) });

  const plusModel = visuals.deriveDensityStageVisualModel(plus, "x");
  const plusIModel = visuals.deriveDensityStageVisualModel(plusI, "y");

  assert.notEqual(plusModel.qubits[0].coherencePhase, plusIModel.qubits[0].coherencePhase);
  assert.equal(Number(plusModel.qubits[0].radius.toFixed(6)), 1);
  assert.equal(Number(plusIModel.qubits[0].radius.toFixed(6)), 1);
});

test("maximally mixed states render centered low-radius clouds", () => {
  const maximallyMixed = density.singleQubitDensityMatrix({ rho00: 0.5, rho11: 0.5, rho01: complex.complex(0, 0) });
  const model = visuals.deriveDensityStageVisualModel(maximallyMixed);

  assert.equal(Number(model.qubits[0].radius.toFixed(6)), 0);
  assert.equal(Number(model.qubits[0].purity.toFixed(6)), 0.5);
  assert.equal(model.qubits[0].coherencePhase, null);
});

test("product mixed states show no pair correlation arcs while correlated states do", () => {
  const mixed = density.singleQubitDensityMatrix({ rho00: 0.5, rho11: 0.5, rho01: complex.complex(0, 0) });
  const product = density.tensorProductDensityMatrices([mixed, mixed]);
  const correlated = bellStateDensity();

  const productModel = visuals.deriveDensityStageVisualModel(product);
  const correlatedModel = visuals.deriveDensityStageVisualModel(correlated);

  assert.equal(productModel.pairCorrelations[0].strength, 0);
  assert.ok(correlatedModel.pairCorrelations[0].strength > 0.5);
});

test("mixed circuit labels avoid entanglement terminology in user-facing copy", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(path.join(process.cwd(), "src/components/mixed-state/MixedCircuitPanel.vue"), "utf8");

  assert.match(source, />Correlations</);
  assert.match(source, />Groups</);
  assert.doesNotMatch(source, />Pairwise</);
  assert.doesNotMatch(source, />Multipartite</);
  assert.doesNotMatch(source, /Pairwise entanglement/);
});
