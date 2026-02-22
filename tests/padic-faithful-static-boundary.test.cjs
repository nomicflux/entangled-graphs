const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = process.cwd();

const listFiles = (directory) => {
  const abs = path.join(workspaceRoot, directory);
  if (!fs.existsSync(abs)) {
    return [];
  }

  const stack = [abs];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }

      if (entry.name.endsWith(".ts") || entry.name.endsWith(".vue")) {
        files.push(full);
      }
    }
  }

  return files;
};

const forbiddenTokens = [
  "StageInspector",
  "CircuitStageSnapshots",
  "BlochPairView",
  "simulate_columns_ensemble",
  "measurement_distribution_for_ensemble",
  "from \"../../quantum\"",
  "from \"../quantum\"",
  "from \"../../state\"",
  "from \"../state\"",
  "Born probability",
];

const forbiddenTemplateTokens = [
  "probability",
  "formatPercent(",
  "CNOT",
  "TOFFOLI",
  "SWAP",
  "CSWAP",
  "gate palette",
  "gate pipeline",
  "%",
];

test("padic-faithful modules do not import complex-era visualization or simulator paths", () => {
  const files = [
    ...listFiles("src/padic-faithful"),
    ...listFiles("src/components/padic-faithful"),
  ];

  assert.ok(files.length > 0);

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const token of forbiddenTokens) {
      assert.equal(
        source.includes(token),
        false,
        `${path.relative(workspaceRoot, file)} contains forbidden token: ${token}`,
      );
    }

    if (file.endsWith(".vue")) {
      const templateMatch = source.match(/<template>[\s\S]*?<\/template>/);
      const templateSource = templateMatch ? templateMatch[0] : "";

      for (const token of forbiddenTemplateTokens) {
        assert.equal(
          templateSource.includes(token),
          false,
          `${path.relative(workspaceRoot, file)} template contains forbidden token: ${token}`,
        );
      }
    }
  }
});
