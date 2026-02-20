# p-adic Qubits: Detailed Reference Notes

## Purpose
This document is a **reference archive** for future work. It is not an implementation plan.

It records, as directly as possible, what is in the provided pages, with clear source boundaries.

## Sources (provided)
1. [PubMed 36673227](https://pubmed.ncbi.nlm.nih.gov/36673227/)
2. [MDPI Entropy 25(1):86](https://www.mdpi.com/1099-4300/25/1/86)
3. [PMC full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9857597/)
4. [Emergent Mind topic page](https://www.emergentmind.com/topics/p-adic-qubit-composition)

Note:
- PubMed `36673227` corresponds to DOI `10.3390/e25010086` and PMCID `PMC9857597`.
- The user-supplied short PMC URL (`PMC985759`) appears truncated; the full article is `PMC9857597`.

## Source map
- Primary formal source: `PubMed + MDPI + PMC` for the same paper.
- Secondary synthesis source: `Emergent Mind` (aggregates multiple papers, including works from 2021, 2023, 2025, 2026).

## A. Primary paper: section-by-section reference (Aniello, Mancini, Parisi; Entropy 2023, 25, 86)

## A1. Abstract-level commitments
The paper proposes:
- a model of `N`-dimensional p-adic quantum systems (quNits) over a quadratic extension of `Q_p`,
- states as p-adic statistical operators (trace-one selfadjoint operators),
- observables via selfadjoint-operator-valued measures (SOVMs),
- explicit treatment of the `N=2` case (p-adic qubit + 2D SOVMs),
- comparison points against standard complex-qubit structure.

## A2. Section 1 (Introduction): what the paper claims as motivation/scope
Key points in scope:
- p-adic numbers are non-Archimedean with ultrametric structure.
- existing p-adic physics/quantum-mechanics literature is referenced as background.
- the paper positions itself as building a quNit state/observable framework in finite dimensions.
- tensor products/entanglement are stated as future work, not fully developed in this paper.

## A3. Section 2 (Overview on p-Adic Numbers)

### A3.1 Valuations and ultrametricity
The paper defines valuation axioms `(V1)-(V3)` and non-Archimedean strengthening `(V4)`.

Explicit consequence:
- ultrametric property (their Eq. (2)) replaces ordinary triangle geometry.

### A3.2 p-adic absolute value and completion
For rationals, the p-adic absolute value is introduced (Eq. (3)), metric via Eq. (4), and completion to `Q_p` is reviewed.

### A3.3 Canonical p-adic expansion
A unique expansion for nonzero p-adics is given (Eq. (5)); the text compares this structurally with decimal expansions (Eq. (6)).

### A3.4 Geometric/topological properties listed in the paper
Properties `(P1)-(P4)` are highlighted, including:
- every point in a ball is a center,
- balls are nested/disjoint,
- clopen-ball behavior,
- isosceles-triangle behavior in ultrametric spaces,
- total disconnectedness.

### A3.5 Quadratic extensions
The paper introduces `K = Q_p(eta)` with `eta^2` equal to a non-square element.

Included details:
- field operations and inverse formula (Eq. (9)),
- conjugation map (Eq. (10)) and its properties (Eq. (11)),
- unique extension of valuation to `K` (Eq. (12)),
- classification remarks: for `p=2`, three non-isomorphic quadratic extensions; for odd `p`, seven non-isomorphic quadratic extensions.

## A4. Section 3 (p-Adic Hilbert Spaces and Operators)

### A4.1 p-adic normed/Banach spaces
Definition 1 introduces p-adic normed spaces via `(N1)-(N3)` (ultrametric norm conditions).

Normality/orthogonality background:
- norm-orthogonality and normal sets are reviewed,
- expansion/control conditions are given in Eqs. (13)-(14).

Example:
- `c_0(I, K)`-type sequence space with sup norm (Eqs. (15)-(17)) as a p-adic Banach example.

### A4.2 Non-Archimedean inner product
Definition 2 specifies inner product requirements:
- linearity in second argument,
- Hermitianity,
- Cauchy-Schwarz.

The paper treats this as sesquilinear structure and discusses non-degeneracy.

### A4.3 Orthonormal bases and p-adic Hilbert-space conditions
Definition 3 gives orthonormal-basis notion in this setting.

Two key structural statements are listed as `(H1)` and `(H2)`:
- expansion in orthonormal basis,
- non-Archimedean Parseval-type identity (Eq. (20)).

### A4.4 Linear operators
For finite-dimensional `H`:
- matrix representation of operators and inverse correspondence (Eqs. (21)-(22)),
- operator norm (Eq. (23)),
- adjoint operator expression (Eq. (24)),
- selfadjoint subset remark (Remark 5, Eq. (26)).

### A4.5 Hilbert-Schmidt structure on operator space
The paper defines trace (Eq. (27)) and p-adic Hilbert-Schmidt product (Eq. (30)), builds canonical operator basis (Eqs. (31)-(36)), and states:
- **Theorem 1**: operator space becomes an inner-product p-adic Banach space with this structure.

## A5. Section 4 (Physical States and Observables)

### A5.1 State concept in p-adic setting
The paper positions p-adic states as normalized involution-preserving bounded functionals on the relevant Banach `*`-algebra framework (citing prior work).

It then introduces p-adic statistical operators explicitly.

### A5.2 p-adic probability remarks (critical)
The text emphasizes p-adic-probability differences from real probability:
- distributions are valued in p-adic closure context,
- affine (not convex) geometry is emphasized,
- values that would look “negative” or “>1” in real ordering can still be legitimate in p-adic probability models.

### A5.3 Definition 5 (p-adic statistical operators)
Definition 5 gives the core object:
- trace-one selfadjoint operators (Eq. (37) defines the set).

### A5.4 Observables via SOVMs
The paper introduces discrete SOVMs as p-adic counterpart of POVMs.

Important remarks:
- SOVM should be viewed as additive measure on subsets (Remark 8).
- no straightforward positivity-based POVM analog exists because `Q_p` is not ordered (Remark 9).

### A5.5 Pairing of states and observables
Using trace-functional pairing (Eq. (38)), the paper states conditions (Eq. (39)) implying:
- normalized involution-preserving functionals,
- output sequences from `(state, SOVM)` pairings form p-adic probability distributions.

The paper explicitly says this provides a complete statistical-content description for the presented model.

### A5.6 Two-dimensional case: explicit p-adic qubit construction
For `N=2`, the state set is identified with trace-one p-adic Hermitian `2x2` matrices (Eq. (40)).

Then:
- generic traceless p-adic Hermitian form from constraints (Eqs. (41)-(43)),
- p-adic Pauli matrices introduced (Eq. (44)),
- compact decomposition (Eqs. (45)-(47)),
- explicit qubit-state matrix form (Eq. (48)).

### A5.7 Differences vs complex qubit highlighted in the paper
The paper flags two substantial differences:
1. the p-adic qubit state set is norm-unbounded,
2. diagonalization/eigenvalue behavior can fail over chosen quadratic extensions because p-adic fields are not algebraically closed.

Details:
- eigenvalue expression given (Eq. (49)) with quadratic-element requirement,
- explicit non-diagonalizable example developed via characteristic polynomial (Eq. (50)),
- claim extended to show non-diagonalizable examples across quadratic extensions.

### A5.8 Example 6 (SOVM example)
Example 6 gives:
- explicit 2D SOVM operator family (Eqs. (51)-(52)),
- resulting measurement output distribution formula (Eq. (53)),
- statement that resulting sequence is a p-adic probability distribution.

## A6. Section 5 (Conclusions + explicit future directions)
The paper summarizes:
- p-adic quNit model over quadratic extension,
- operator-space Hilbert structure,
- p-adic statistical operators and SOVMs,
- 2D qubit/SOVM explicit treatment.

Future work stated in the paper:
- tensor products and entanglement classes,
- dynamical maps and semigroups (p-adic channel analogs),
- entropic quantities (von Neumann/Renyi analogs).

## B. PubMed page reference content
PubMed page contributes bibliographic anchors:
- PMID `36673227`
- PMCID `PMC9857597`
- DOI `10.3390/e25010086`
- abstract aligned with MDPI/PMC abstract.

## C. MDPI page reference content
MDPI page mirrors the article content and metadata.

Practical use in this reference:
- confirms publication version and section/equation numbering,
- duplicate source for section text when PMC formatting differs.

## D. Emergent Mind page: extracted claims (secondary synthesis)

The Emergent Mind page states a broader ecosystem around p-adic qubit composition, including:
- representation-theoretic constructions using compact p-adic rotation groups,
- tensor-product completion via projective norms,
- Clebsch-Gordan decomposition structures for composed irreps,
- gate/universality claims (including dense subsets in orthogonal groups for specific cases),
- adelic/global constructions,
- links to references from 2021, 2023, 2025, 2026.

Important source-status note:
- these are synthesis-level claims and may combine results from multiple papers not contained in the 2022 Entropy article.
- treat as a map to additional primary literature, not as a replacement for primary proofs.

## E. Reference-only boundary notes
What is directly established in the primary 2022/2023 paper:
- p-adic state/observable model using statistical operators and SOVMs,
- p-adic qubit construction in `N=2`,
- specific differences from complex case (unboundedness, non-guaranteed diagonalizability).

What is mostly outside that single paper and appears via secondary synthesis / later works:
- full p-adic tensor-product entanglement program,
- universal gate families from p-adic representation theory,
- adelic multi-qubit frameworks.

## F. High-value details to keep for later work (still reference, not prescription)
- p-adic probability is affine-valued and not positivity-ordered like real probability.
- SOVM notion is central because positivity-based POVM transfer is not straightforward.
- eigen/spectral workflows may require field-extension awareness and still may fail for some states.
- equation-number anchors `(37)-(53)` in Section 4 are the core local references for qubit/state/measurement definitions.

## G. External discussion takeaways: fractal-style p-adic visualization (adapted)

Source status:
- This section summarizes your provided design discussion block.
- It is a design reference input, not a peer-reviewed primary source.

What is useful to keep for this repo:
1. A finite, deterministic node set for visualization and animation.
2. A p-adic digit-driven geometry mode (fractal-like clustering by shared prefixes).
3. A valuation/ring geometry mode (radius from valuation, angle from residue/index).
4. A single normalization pipeline from abstract points to screen coordinates.
5. Caching rules for position maps and transition maps with explicit invalidation.
6. Frame interpolation for smooth transition animation.
7. Optional seeded trajectory highlighting over repeated transitions.

What must be changed for `entangled-graphs`:
1. Replace polynomial transition dynamics `f(x)` with circuit-driven quantum stage transitions.
2. Replace generic integer dynamical states with simulator-derived state descriptors:
- basis-state indices and probabilities/weights per stage, and/or
- measurement branches from in-circuit measurements.
3. Replace optional `sqrt/cbrt` transform branching with branching induced by measurement operations.
4. Replace free `p^power` node-count driver with existing qubit-count driver:
- node count follows basis size `2^n` for `n` qubits (current app constraint `1..8`),
- prime `p` controls p-adic geometry/valuation semantics, not qubit count.
5. Keep mode switching strictly visual unless a measurement model switch is explicitly selected.

What to remove for current scope:
1. Polynomial coefficient controls (`a,b,c,d`) and any polynomial-root dynamics.
2. Standalone dynamical-system graph generation independent of the circuit model.
3. Norm toggles that change graph semantics without going through selected simulator models.

Fractal-like visualization modes suitable for current purposes:
1. `padic_vector` mode (digit-vector embedding):
- map chosen scalar/index representation to base-`p` digits,
- place each basis/branch point by summed digit vectors with decaying radius.
2. `valuation_ring` mode (circular valuation embedding):
- radius encodes valuation-derived quantity (or normalized valuation proxy),
- angle encodes stable index ordering (e.g., basis index ordering within stage).

Adapted animation semantics for this app:
1. Per circuit stage, compute point cloud from distribution/ensemble.
2. For stage `t -> t+1`, interpolate point positions and intensities over frame steps.
3. Render transition links where probability/weight transfer is nontrivial.
4. If a seed is selected, keep trajectory highlights persistent across stage traversal.

Adapted minimal correctness checks:
1. Switching geometry mode changes only geometry, not computed distributions.
2. Changing qubit count changes displayed node count to `2^n`.
3. Changing prime `p` updates p-adic geometry-dependent layout deterministically.
4. In-circuit measurement increases/changes branch structure as expected and consistently.
5. Fixed configuration + fixed circuit + fixed random seed yields deterministic render trajectory.

## H. Traceability index
- Primary formal paper (PMC full text): [PMC9857597](https://pmc.ncbi.nlm.nih.gov/articles/PMC9857597/)
- Bibliographic anchor: [PubMed 36673227](https://pubmed.ncbi.nlm.nih.gov/36673227/)
- Publisher mirror: [MDPI article page](https://www.mdpi.com/1099-4300/25/1/86)
- Secondary synthesis: [Emergent Mind topic](https://www.emergentmind.com/topics/p-adic-qubit-composition)
