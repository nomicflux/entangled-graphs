const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const readSource = (workspacePath) => fs.readFileSync(path.join(process.cwd(), workspacePath), "utf8");

test("single-qubit placement hint tells the user to click a wire to place it", () => {
  const source = readSource("src/components/circuit/useCircuitGridComputed.ts");
  assert.match(source, /click a wire to place it/);
});

test("mixed-state circuit groups noise gates with new-gate strength controls and includes 0%", () => {
  const source = readSource("src/components/mixed-state/MixedCircuitPanel.vue");
  const constantsSource = readSource("src/mixed-state/constants.ts");

  assert.match(source, /mixed-noise-group/);
  assert.match(source, /New Noise Gate Strength/);
  assert.match(constantsSource, /\[0,\s*0\.1,\s*0\.25,\s*0\.5\]/);
});
