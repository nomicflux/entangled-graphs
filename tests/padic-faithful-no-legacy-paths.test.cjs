const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = process.cwd();

const removedPaths = [
  "src/components/PAdicWorkbench.vue",
  "src/components/padic",
  "src/quantum/padic",
  "src/quantum/padic.ts",
  "src/padic-config.ts",
  "src/state/padic-actions.ts",
  "src/styles/padic-state-map.css",
];

const listSourceFiles = () => {
  const roots = ["src"];
  const files = [];

  for (const root of roots) {
    const absRoot = path.join(workspaceRoot, root);
    if (!fs.existsSync(absRoot)) {
      continue;
    }

    const stack = [absRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
          continue;
        }

        if (entry.name.endsWith(".ts") || entry.name.endsWith(".vue") || entry.name.endsWith(".cjs")) {
          files.push(full);
        }
      }
    }
  }

  return files;
};

test("legacy p-adic implementation paths are removed", () => {
  for (const relPath of removedPaths) {
    const absPath = path.join(workspaceRoot, relPath);
    assert.equal(fs.existsSync(absPath), false, `${relPath} should be removed`);
  }
});

test("source tree has no imports or references to removed p-adic paths", () => {
  const forbiddenRefs = [
    "components/PAdicWorkbench.vue",
    "components/padic/",
    "quantum/padic",
    "padic-config",
    "state/padic-actions",
    "styles/padic-state-map.css",
  ];

  for (const file of listSourceFiles()) {
    const source = fs.readFileSync(file, "utf8");
    for (const token of forbiddenRefs) {
      assert.equal(
        source.includes(token),
        false,
        `${path.relative(workspaceRoot, file)} contains forbidden reference: ${token}`,
      );
    }
  }
});
