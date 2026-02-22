const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const readSource = (workspacePath) =>
  fs.readFileSync(path.join(process.cwd(), workspacePath), "utf8");

test("faithful output panel uses valuation-shell-first p-adic columns with derived w_norm", () => {
  const source = readSource("src/components/padic-faithful/PAdicOutputsPanel.vue");

  assert.match(source, /Statistical Outputs omega_i/);
  assert.match(source, /valuation shell/);
  assert.match(source, /digit prefix/);
  assert.match(source, /w_norm \(Derived\)/);
  assert.match(source, /digits \(base p\)/);
  assert.equal(source.toLowerCase().includes("probability"), false);
  assert.equal(source.includes("formatPercent("), false);
  assert.equal(source.includes("prob-bar"), false);
});

test("faithful workbench keeps operator and sovm primary labels", () => {
  const workbench = readSource("src/components/padic-faithful/PAdicFaithfulWorkbench.vue");
  const rho = readSource("src/components/padic-faithful/PAdicRhoPanel.vue");
  const sovm = readSource("src/components/padic-faithful/PAdicSovmPanel.vue");
  const input = readSource("src/components/padic-faithful/PAdicGeneralInputPanel.vue");
  const circuit = readSource("src/components/padic-faithful/PAdicCircuitPanel.vue");

  assert.match(rho, /State Operator rho/);
  assert.match(sovm, /SOVM Effects F_i/);
  assert.match(input, /General Qubit Input/);
  assert.match(circuit, /p-adic Circuit/);
  assert.match(workbench, /PAdicGeneralInputPanel/);
  assert.match(workbench, /PAdicCircuitPanel/);
});
