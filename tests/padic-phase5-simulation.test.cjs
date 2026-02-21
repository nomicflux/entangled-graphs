const test = require("node:test");
const assert = require("node:assert/strict");

const padic = require("../.tmp-test/quantum/padic.js");
const stateOperators = require("../.tmp-test/state/operators.js");

const resolver = (gate) => {
  if (stateOperators.isBuiltinGate(gate)) {
    return stateOperators.builtinOperatorMap[gate];
  }
  return null;
};

const asMap = (distribution) => new Map(distribution.map((entry) => [entry.basis, Number(entry.probability.toFixed(6))]));

const seqRandom = (...values) => {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0.5;
    index += 1;
    return value;
  };
};

test("p-adic measurement models produce deterministic normalized distributions", () => {
  const prepared = padic.p_adic_prepared_state_from_raw_qubits(
    [
      {
        localStates: [
          { value: 0, amplitude: { raw: "1" } },
          { value: 1, amplitude: { raw: "4" } },
        ],
      },
    ],
    2,
  );
  const ensemble = [{ weight: 1, state: prepared }];

  const valuation = asMap(padic.measurement_distribution_for_padic_ensemble(ensemble, 2, "valuation_weight"));
  const character = asMap(padic.measurement_distribution_for_padic_ensemble(ensemble, 2, "character_based"));
  const operator = asMap(padic.measurement_distribution_for_padic_ensemble(ensemble, 2, "operator_ensemble"));

  const sum = (map) => [...map.values()].reduce((acc, value) => acc + value, 0);
  assert.equal(Number(sum(valuation).toFixed(6)), 1);
  assert.equal(Number(sum(character).toFixed(6)), 1);
  assert.equal(Number(sum(operator).toFixed(6)), 1);

  assert.notDeepEqual(valuation, character);
  assert.notDeepEqual(operator, valuation);
});

test("sampled p-adic run supports replay and resample-from-point", () => {
  const prepared = padic.p_adic_prepared_state_from_raw_qubits(
    [
      {
        localStates: [
          { value: 0, amplitude: { raw: "3" } },
          { value: 1, amplitude: { raw: "1" } },
        ],
      },
    ],
    2,
  );
  const columns = [
    { gates: [{ id: "m1", gate: "M", wires: [0] }] },
    { gates: [{ id: "x1", gate: "X", wires: [0] }] },
  ];

  const first = padic.sample_padic_circuit_run(
    prepared,
    columns,
    resolver,
    1,
    2,
    "operator_ensemble",
    seqRandom(0.1, 0.5),
  );

  const second = padic.sample_padic_circuit_run(
    prepared,
    columns,
    resolver,
    1,
    2,
    "operator_ensemble",
    seqRandom(0.99, 0.5),
    {
      priorOutcomes: first.outcomes.map((entry) => ({ gateId: entry.gateId, value: entry.value })),
      resampleFromGateId: "m1",
    },
  );

  assert.equal(first.outcomes.length, 1);
  assert.equal(second.outcomes.length, 1);
  assert.equal(first.outcomes[0].gateId, "m1");
  assert.equal(second.outcomes[0].gateId, "m1");
  assert.notEqual(first.outcomes[0].value, second.outcomes[0].value);
});
