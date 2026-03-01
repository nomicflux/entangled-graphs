const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const readSource = (workspacePath) =>
  fs.readFileSync(path.join(process.cwd(), workspacePath), "utf8");

test("error-code scaffolds use a shared error injection panel and keep a distinct output panel", () => {
  const shared = readSource("src/components/error-codes/shared/ErrorInjectionPanel.vue");
  const bitFlip = readSource("src/components/error-codes/bit-flip/BitFlipRepetitionScaffold.vue");
  const phaseFlip = readSource("src/components/error-codes/phase-flip/PhaseFlipRepetitionScaffold.vue");
  const shor = readSource("src/components/error-codes/shor/ShorNineQubitScaffold.vue");

  assert.match(shared, /Error Injection/);

  for (const source of [bitFlip, phaseFlip, shor]) {
    assert.match(source, /ErrorInjectionPanel/);
    assert.match(source, /<h2>Output<\/h2>/);
    assert.match(source, /error-code-side-column/);
  }
});
