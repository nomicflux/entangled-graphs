# p-adic Qubits: Detailed Cheat Sheet

## Source basis
- [PubMed 36673227](https://pubmed.ncbi.nlm.nih.gov/36673227/)
- [Entropy 25(1):86 (MDPI)](https://www.mdpi.com/1099-4300/25/1/86)
- [PMC full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9857597/)
- [Emergent Mind synthesis](https://www.emergentmind.com/topics/p-adic-qubit-composition)

## 1. p-adic basics that matter for qubits
- p-adic numbers are organized by divisibility by a prime `p`.
- Valuation `v_p(x)` counts powers of `p` in `x`.
- Norm is `|x|_p = p^{-v_p(x)}`.
- Geometry is ultrametric: `|x+y|_p <= max(|x|_p, |y|_p)`.

Why this matters:
- “Closeness” is tree/hierarchy-like, not Euclidean.
- State neighborhoods and perturbation behavior differ from standard qubits.

## 2. How p-adic qubits differ from standard (complex) qubits

Standard qubit picture:
- amplitudes in `C`
- compact Bloch sphere intuition
- positivity and Born probabilities from ordered real numbers

p-adic qubit picture in the paper framework:
- amplitudes/operators over `Q_p` (or extension when required)
- statistical-operator formalism adapted to non-Archimedean settings
- no direct ordered-field positivity like complex QM
- measurement requires explicit p-adic-to-real probability semantics

## 3. Big structural differences called out in the qubit paper
- p-adic qubit state set is not compact like the complex Bloch sphere.
- Not every valid p-adic statistical operator diagonalizes over base field `Q_p`.
- Extension fields can be required for spectral decomposition and some gate constructions.

## 4. Composition and entanglement
- Tensor-product composition still applies (`Q_p^2 ⊗ Q_p^2`, etc.).
- Product vs entangled distinction remains meaningful.
- For 2-qubit pure states, separability keeps a determinant/minor test (`ad-bc=0` style).

## 5. Gates in p-adic settings
- Gates with entries only in `{0, ±1}` transfer most directly.
- Phase/imaginative components (and `1/sqrt(2)`-style factors) can require extension-field handling.
- Gate availability can depend on prime `p` and selected field model.

## 6. Why implementation cannot hide “model choices”
A runnable simulator must explicitly specify:
- prime `p`
- precision/truncation policy
- scalar field (`Q_p` or extension)
- measurement model (how amplitudes become real sampling weights)
- entanglement diagnostic model for mixed states

If these are implicit, results are ambiguous.

## 7. Practical interpretation
p-adic qubits are not “complex qubits with another number type.”
They alter:
- geometry,
- spectral behavior,
- measurement semantics,
- gate feasibility constraints,
- and numerical stability criteria.

That is exactly why an interactive implementation must show its model configuration in the UI.
