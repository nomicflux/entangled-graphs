# p-adic Workspace: 100% Paper-Faithful Specification

Status: Draft  
Scope: Normative product+engineering contract for a paper-faithful p-adic mode  
Authority: `/Users/demouser/Code/entangled-graphs/docs/p-adic-qubits-reference.md`

## 0) Delivery Status (Snapshot: February 22, 2026)
This section tracks implementation progress against this spec.

Completed (current tree):
1. Legacy p-adic workspace was removed and replaced by a hermetic p-adic-faithful page rooted at:
   - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicFaithfulWorkbench.vue`
   - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/*`
2. SPA routing opens p-adic directly to faithful components (no wrapper shim):
   - `/Users/demouser/Code/entangled-graphs/src/App.vue`
3. Legacy p-adic paths were deleted:
   - `/Users/demouser/Code/entangled-graphs/src/components/padic/`
   - `/Users/demouser/Code/entangled-graphs/src/quantum/padic/`
   - `/Users/demouser/Code/entangled-graphs/src/state/padic-actions.ts`
   - `/Users/demouser/Code/entangled-graphs/src/styles/padic-state-map.css`
4. p-adic UI is valuation-shell-first and p-adic-primary (`omega_i`, `v_p`, `|.|_p`, residue, digits; `w_norm` labeled `Derived`):
   - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicOutputsPanel.vue`
   - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicStageCards.vue`
   - `/Users/demouser/Code/entangled-graphs/src/components/padic-faithful/PAdicOutcomeInspector.vue`
5. Static/regression coverage exists to block regressions to legacy paths and complex-era p-adic visuals:
   - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-static-boundary.test.cjs`
   - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-no-legacy-paths.test.cjs`
   - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-ui-contract.test.cjs`
   - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-state.test.cjs`
   - `/Users/demouser/Code/entangled-graphs/tests/padic-faithful-engine.test.cjs`

Remaining (strict paper-faithful blockers):
1. Replace numeric-real approximation internals with true p-adic value objects (or explicit finite truncation objects with algebraic semantics).
   Current non-compliant files:
   - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/engine/parse.ts`
   - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/engine/valuation.ts`
   - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/engine/digits.ts`
2. Replace real-symmetric 2x2 operator handling with p-adic Hermitian/operator primitives consistent with the model contract.
   Current non-compliant file:
   - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/engine/operator.ts`
3. Update p-adic outcome row contract to match this spec exactly (`basis`, `w_raw` naming, and full UI-facing payload contract).
   Current file:
   - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/types.ts`
4. Complete in-shell grouping rule by shared digit prefix (current ordering is valuation then residue/id only).
   Current file:
   - `/Users/demouser/Code/entangled-graphs/src/padic-faithful/engine/pairing.ts`
5. Wire hard checks into CI release workflow (currently build-only, no test/static-faithful gate on deploy workflow).
   Current file:
   - `/Users/demouser/Code/entangled-graphs/.github/workflows/deploy-pages.yml`

## 1) Non-Negotiable Goal
Implement p-adic mode with strict fidelity to the primary paper model summarized in the reference:
1. States are p-adic statistical operators (trace-one, selfadjoint operators).
2. Observables are SOVMs (selfadjoint-operator-valued measures), not POVMs.
3. Output "probabilities" are p-adic-valued statistical outputs, not forced into complex Born-rule semantics.
4. No complex-theory fallback is permitted anywhere in the p-adic execution path.

This spec intentionally forbids hybridization ("p-adic labels over complex engine").

## 2) Source Boundary and Fidelity Rule
Primary formal source: Entropy 2023, 25, 86 (PMCID `PMC9857597`) as captured in the reference doc.

Fidelity rule:
1. If a behavior is explicitly established in the primary paper, p-adic mode must follow it.
2. If a behavior is not established in the primary paper, it must be marked "out of scope" for paper-faithful mode.
3. Features from secondary synthesis or later papers may not be silently mixed into paper-faithful mode.

## 3) Mathematical Model Contract

### 3.1 Number System
All p-adic-mode numeric semantics are over p-adic field objects (or declared finite truncations that preserve p-adic algebraic meaning).

Required:
1. Explicit `p`-adic valuation support.
2. Explicit p-adic absolute value / norm semantics.
3. Field-level operations that do not route through complex-number primitives.

### 3.2 Hilbert/Operator Layer
p-adic mode state space is operator-centric:
1. Finite-dimensional p-adic Hilbert framework.
2. State represented as statistical operator `rho` (trace-one, selfadjoint).
3. Observable represented as SOVM family `{F_i}` over outcomes.
4. Statistical output from trace pairing `tr(rho F_i)`.

### 3.3 Qubit-Specific (`N=2`) Contract
For p-adic qubit view:
1. Expose the 2x2 p-adic Hermitian trace-one representation directly.
2. Expose coefficients/invariants in p-adic terms (valuation, norm, residue digits where relevant).
3. Do not reinterpret p-adic qubit as a complex amplitude vector.

## 4) Explicit Prohibitions (Hard Fail)
The following are forbidden in p-adic mode:
1. Complex amplitude vector state (`|psi>` over `C`) as p-adic state substrate.
2. Complex Born rule as p-adic measurement rule.
3. Complex unitary gate application as hidden p-adic evolution engine.
4. Bloch-sphere geometry as primary p-adic state geometry.
5. Any prep schema restricted to two amplitudes `{a,b}` as the canonical p-adic state object.
6. Any normalization step that enforces real `[0,1]` probability semantics by default.
7. Silent fallback from p-adic operations into complex operations on parse/compute error.
8. Complex-era probability-cloud visuals, probability bars, or Bloch-derived display metaphors in p-adic-primary panels.
9. Reusing shared complex-first UI components as p-adic presentation primitives.
10. Reusing complex-case calculation pipelines (or relabeled outputs) as inputs to p-adic-primary visuals.

## 5) UI Contract for Paper-Faithful Mode

### 5.1 Primary Panels
Prepared state, evolution, and measurement panels must be operator/SOVM-first.

Required primary labels:
1. `rho` (state operator)
2. `F_i` (SOVM effects)
3. `omega_i = tr(rho F_i)` (p-adic statistical outputs)
4. `v_p`, `|.|_p`, residue, base-`p` digits

### 5.2 Secondary Views
Any derived or embedding view must be clearly marked `Derived`.

Derived views may include:
1. Digit-vector geometry
2. Valuation-ring geometry

But derived views cannot redefine core state semantics.

### 5.3 Balanced Preset
If a "balanced" preset exists, it must be defined over the full visible valid local p-adic state set for that system representation, not two amplitudes.

### 5.4 Statistical Output Presentation (Valuation-First)
p-adic measurement UI must be rebuilt from scratch around p-adic outputs, not copied probability UI.

Required primary table row for each outcome `i`:
1. `omega_i = tr(rho F_i)` (raw p-adic output)
2. `v_p(omega_i)`
3. unit/residue class
4. base-`p` digit expansion (finite shown precision with explicit truncation marker if needed)

Required ordering/grouping:
1. Group outcomes by valuation shells (`v_p` bands).
2. Within shell, group by residue / shared digit prefix.
3. Do not default-sort by descending real-valued probability bars.

Derived layer (optional, must be labeled `Derived`):
1. `w_norm,i = N(omega_i) / sum_j N(omega_j)` for chosen comparison norm `N`.
2. `w_norm` is shown as scalar value, never as `%`.
3. Derived layer must never replace primary `omega_i` display.

Forbidden display patterns in p-adic-primary panels:
1. Percent-first probability rows.
2. Labels implying Born-rule interpretation as canonical p-adic meaning.
3. Single-metric bar charts without visible `omega_i` / `v_p` context.

### 5.5 Gate/Operation Presentation (Paper-Faithful)
Paper-faithful mode must not reuse complex gate UX as if it were canonical p-adic theory.

In strict paper-faithful mode:
1. Primary operations are operator updates and SOVM measurement definitions.
2. "Gate palette" UI is disabled by default unless each gate has a sourced p-adic operator definition in-scope.
3. Any retained gate-like controls are labeled `Research Extension (non-primary-paper)` and hidden by default.

### 5.6 Visual Hard Reset (Mandatory)
p-adic visualization must be rebuilt from scratch for p-adic semantics.

Required:
1. p-adic panels must render p-adic records directly: `omega_i`, `v_p`, `|.|_p`, unit/residue class, base-`p` digits.
2. Stage and measurement views must be valuation-shell-first; shell grouping is the default top-level structure.
3. Any normalized scalar (`w_norm`) must be explicitly labeled `Derived` and never be the only visible metric.
4. p-adic state-map geometry must be explained in p-adic terms only (valuation shells, residues, digits), never via complex-probability language.
5. p-adic pages must be implemented as p-adic-only components, not wrappers over complex visualization components.

Forbidden:
1. Probability-cloud images for p-adic-primary state semantics.
2. Any `%`-first probability presentation in p-adic-primary views.
3. Shared distribution-bar widgets inherited from complex mode.
4. Bloch visual primitives in p-adic-primary stage/measurement presentation.
5. Adapter/shim layers that preserve complex visual contracts and only rename fields.

## 6) Scope and Feature Gates for 100% Faithfulness

### 6.1 In-Scope (Primary Paper)
1. Statistical-operator state model.
2. SOVM observable model.
3. p-adic-valued statistical outputs.
4. Two-dimensional p-adic qubit operator representation.

### 6.2 Out-of-Scope for "100% Primary-Paper Faithful" Mode
Unless separately sourced and explicitly flagged:
1. Full tensor-product entanglement engine.
2. Multi-qubit gate calculus (CNOT/Toffoli semantics).
3. Universal gate-set claims from later literature.
4. Adelic/global constructions.

If these are present elsewhere in the app, they must be disabled or labeled "Research Extension (non-primary-paper)" inside paper-faithful mode.

### 6.3 Gate Availability Rule
In paper-faithful mode, available operations must be source-justified:
1. Keep only operations directly represented in the primary model (state operator manipulation + SOVM evaluation).
2. Do not expose complex-style universal gate sets by default.
3. If extension gates are enabled in non-faithful profiles, the profile boundary must be explicit in UI and persisted state.

## 7) Data Model Contract
p-adic mode store/types must satisfy:
1. Canonical state object is `rho` (not `{a,b}` or complex vector).
2. Canonical measurement object is SOVM set `{F_i}`.
3. Result payload stores p-adic statistical outputs before any real-valued visualization transform.
4. Any real-valued projection used for charts is a derived cached layer only.
5. UI-facing p-adic outcome row model must include `basis`, `omega_i` (`w_raw`), `v_p`, `|.|_p`, unit/residue, and base-`p` digits.
6. p-adic stage visualization payloads may not depend on complex-mode stage view schemas.

## 8) Engine Contract

### 8.1 Allowed Engine Behavior
1. Evolve operator objects with p-adic-valid linear algebra primitives.
2. Compute measurement outputs via trace pairing with SOVM effects.
3. Preserve p-adic values through the full computation path.

### 8.2 Disallowed Engine Behavior
1. "Convert to complex, evolve, convert back."
2. "Compute Born probabilities first, then relabel as p-adic."
3. "Use p-adic metrics only as inspector annotations over complex outcomes."

## 9) Compliance Tests (Release Gate)
All must pass for paper-faithful certification:
1. Static code scan shows no complex engine imports in p-adic execution modules.
2. p-adic state prep creates operator-form state objects only.
3. p-adic measurement path executes SOVM trace-pairing semantics only.
4. `balanced` spans full valid local state set (UI + state + numeric verification).
5. UI copy and labels never present complex-probability notation as p-adic primary semantics.
6. Any non-primary-paper feature is hidden or explicitly labeled non-faithful extension.
7. p-adic UI modules do not import complex-stage visualization primitives (`BlochPairView`, shared probability-bar inspectors/snapshots).
8. Regression tests fail if p-adic-primary templates reintroduce `%` formatting or probability-bar DOM structures.
9. Regression tests fail if p-adic stage/measurement ordering is not valuation-shell-first.

## 10) Migration/Refactor Checklist
1. Introduce p-adic operator and SOVM core types in dedicated p-adic modules.
2. Remove/retire p-adic dependencies on complex state/vector simulator types.
3. Replace p-adic prep editor with operator-entry and validated helper presets.
4. Rebuild p-adic measurement panel around SOVM outcome sets.
5. Keep geometry/state-map layers derived from p-adic-native outputs.
6. Add regression tests that fail on any reintroduction of complex fallback paths.
7. Delete p-adic wiring to shared complex-first stage inspector/snapshot components and replace with p-adic-only components.
8. Delete p-adic probability-bar/probability-cloud visual pathways and replace with valuation-shell tables.
9. Introduce p-adic-specific stage payload contracts that do not reuse complex distribution/Bloch view objects.
10. Add static checks forbidding p-adic imports from complex visualization components.

## 11) Labeling Policy
Allowed primary wording:
1. "p-adic statistical output"
2. "`omega_i = tr(rho F_i)` / model output"
3. "`v_p`", "`|.|_p`", residue, base-`p` digits

Forbidden primary wording:
1. "Born probability" in p-adic-primary panels
2. "Qubit amplitudes `a,b`" as canonical p-adic state language
3. Any wording implying positivity-ordered real probability as default p-adic law
4. Percent notation as the default headline metric in p-adic-primary measurement output

## 12) Engineering Guardrails
1. Keep p-adic modules physically isolated from complex simulation modules.
2. Add lint/test rule that blocks imports from complex-only files into p-adic core.
3. Require explicit `Derived` annotations for any real-number projection helpers.
4. Add CI check that validates p-adic mode without executing complex simulator branches.
5. Add CI static-template scan for forbidden p-adic UI tokens: `%`, `prob-bar`, `Bloch`, `Born`.
6. Enforce component-boundary rule: p-adic pages must use p-adic-only presentation components.

## 13) Corrective Action Plan (Post-Mortem Driven)
The following corrective actions are mandatory and non-negotiable:
1. Stop incremental "skin" changes; perform hard replacement when a p-adic panel is still structurally complex-first.
2. Remove inherited complex visualization abstractions from p-adic pages before adding new p-adic features.
3. Treat any complex-era metaphor in p-adic-primary UX as a release blocker, not a follow-up task.
4. Require code review checklist item: "Can this panel stand alone as a p-adic-native product without any complex-mode scaffolding?"
5. If the answer to (4) is "no", implementation is incomplete and must not ship.
6. If a panel still depends on complex contracts, delete and rewrite it as p-adic-native instead of adding compatibility glue.

## 14) Definition of Done (Paper-Faithful Mode)
The implementation is done only when:
1. p-adic mode is operator/SOVM-native end-to-end.
2. No p-adic code path depends on complex-state fallback behavior.
3. UI semantics are p-adic-primary and source-faithful.
4. Out-of-scope extensions are clearly separated from paper-faithful mode.
