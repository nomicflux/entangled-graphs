const test = require("node:test");
const assert = require("node:assert/strict");

const access = require("../.tmp-test/app/padic-access.js");

test("padic workspace is enabled only when the query param is present", () => {
  assert.equal(access.isPadicWorkspaceEnabledFromSearch(""), false);
  assert.equal(access.isPadicWorkspaceEnabledFromSearch("?mode=free-form"), false);
  assert.equal(access.isPadicWorkspaceEnabledFromSearch("?padic"), true);
  assert.equal(access.isPadicWorkspaceEnabledFromSearch("?padic=1"), true);
  assert.equal(access.isPadicWorkspaceEnabledFromSearch("?foo=bar&padic=true"), true);
});
