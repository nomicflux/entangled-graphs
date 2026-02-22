# p-adic Visualization Handoff (Post-Mortem + Next-Agent Plan)

## Date
2026-02-22

## Context
This handoff captures the current state after a failed attempt to complete the p-adic stage visualization work.  
The user requirement was explicit: show p-adic numbers correctly and non-lossily, with fractal representation as a primary visualization path.

## Non-negotiable requirements (reconfirmed)
1. No complex-state semantics in p-adic UI (no Bloch semantics, no Born/probability-first framing).
2. p-adic outputs remain primary: `omega_i`, `v_p`, `|.|_p`, residue class, base-`p` digits.
3. `w_norm` only as `Derived`.
4. Stage visuals must be graphical (not text-only cards).
5. Do not hack in parallel visual systems; use one coherent primitive.
6. `I` is a real identity matrix gate and must follow normal matrix evolution (same model as complex case structure, but p-adic math). No special-case rewrite/canonicalization rules for `I`.

## What failed (root cause)
The implementation used a lossy data source for visuals:
- Visualization was driven from diagonal outcome rows (`omega_i`) produced by:
  - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/engine/system.ts` via `outcomeRowsFromDensityDiagonal(...)`
- This ignores off-diagonal operator entries.  
- Result: gates that modify coherence/phase/off-diagonal structure can appear to cause no visual change.

This violated the core invariant:
- Visuals must be a direct rendering of state-level p-adic numbers, not a projection that hides valid state changes.

## Current repository state (important)

### Added/changed visualization pieces
- New shared glyph component:
  - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicNumericGlyph.vue`
- Stage cards now use that glyph:
  - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicStageCards.vue`
- Derived map also uses same glyph:
  - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicDerivedMap.vue`
- Geometry mapping changed:
  - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/derived/geometry.ts`

### Why this is still insufficient
- The shared glyph currently consumes row-level diagonal-derived data.
- It is not rendering full stage operator data (`rho[i,j]`) and therefore is still lossy for state changes.

### Circuit semantics status
- Required semantics: `I` remains an explicit gate/matrix token with no special treatment. Identity behavior must come from correct matrix math, not ad-hoc UI/state rewriting.
- Do not canonicalize `I` to null, and do not add gate-specific shortcuts for `I`.
- Relevant files:
  - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/state/actions.ts`
  - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/state/store.ts`
  - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicCircuitPanel.vue`
- Slot clearing path currently exists via `Alt+Click` in:
  - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicCircuitPanel.vue`

### Tests status
- Suite currently passes, including:
  - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-state.test.cjs`
  - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-ui-contract.test.cjs`
- But these tests do not yet guarantee full-state (off-diagonal-sensitive) visual correctness.

## Next-agent objective (must-do)
Replace the current diagonal-driven stage visualization pipeline with a full-state p-adic visualization pipeline that includes fractal representation and preserves sensitivity to all state-level numeric changes.

## Required implementation plan

1. Build full-stage visualization payload from `stage.operator.entries` (not only `omega_i` rows).
   - Source:
     - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/state/selectors.ts`
     - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/engine/system.ts`
   - Include p-adic descriptors per entry: valuation, norm, residue/unit class, base-`p` digits.

2. Implement fractal representation as primary mode.
   - Follow `docs/p-adic-qubits-reference.md` section guidance (fractal digit-driven mapping).
   - Keep valuation-ring mode optional/secondary only.
   - Do not let ring mode become the only effective visualization.

3. Keep one visualization primitive end-to-end.
   - Rework `PAdicNumericGlyph` (or replace it) so both:
     - stage snapshots/inspector, and
     - derived geometry panel
     use the same full-state payload and same encoding rules.

4. Preserve p-adic-primary UI language.
   - Keep table/readout fields centered on `omega_i`, `v_p`, `|.|_p`, residue, digits.
   - Keep `w_norm` marked as derived.
   - No probability-first text and no complex-era imports/components.

5. Add correctness tests that fail on lossy behavior.
   - Add/extend tests to prove visual payload changes when off-diagonals change while diagonals stay unchanged.
   - Suggested files:
     - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-state.test.cjs`
     - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-ui-contract.test.cjs`
   - Keep boundary test constraints passing:
     - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-static-boundary.test.cjs`

## Minimum acceptance criteria
1. Editing the circuit with gates that alter full state (including off-diagonals) visibly changes stage visualization payload.
2. Fractal representation is present and actually driven by p-adic digit structure, not a cosmetic label.
3. Stage visualization is graphical and uses one coherent primitive.
4. No complex-era visualization imports (`BlochPairView`, `CircuitStageSnapshots`, `StageInspector`).
5. Test suite passes with new off-diagonal-sensitive assertions.

## Files to inspect first (next agent)
1. `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicNumericGlyph.vue`
2. `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicStageCards.vue`
3. `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicDerivedMap.vue`
4. `/Users/demouser/Code/entangled-graphs/src/padic-faithful/derived/geometry.ts`
5. `/Users/demouser/Code/entangled-graphs/src/padic-faithful/state/selectors.ts`
6. `/Users/demouser/Code/entangled-graphs/src/padic-faithful/engine/system.ts`
7. `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-state.test.cjs`
8. `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-ui-contract.test.cjs`

## Final note
This handoff acknowledges the key failure: diagonal-only visualization cannot satisfy the user’s requirement.  
The next agent should prioritize data fidelity over UI polish and treat full-state p-adic rendering as the core deliverable.
