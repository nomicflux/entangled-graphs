<template>
  <main class="panels algorithm-shell">
    <section class="panel">
      <div class="panel-header">
        <h2>Deutsch Input and Oracle</h2>
        <p>Phase 1 scaffold. Oracle controls and input editing will be added next.</p>
      </div>
      <div class="algorithm-notes">
        <p>Standard oracles planned: f(x)=0, f(x)=1, f(x)=x, and f(x)=not x.</p>
        <p>Default setup: |00> with an explicit X gate on the lower wire before Hadamards.</p>
      </div>
    </section>

    <section class="panel panel-center">
      <div class="panel-header">
        <h2>Deutsch Circuit</h2>
        <p>Reusable fixed-circuit rendering lands in the next phase.</p>
      </div>
      <div class="algorithm-notes">
        <p>This panel will show stage snapshots, inspector, and interference-focused views.</p>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>Deutsch Results</h2>
        <p>Phase 1 scaffold. Constant/balanced verdict and sampling will be added next.</p>
      </div>
      <div class="algorithm-notes">
        <p>Primary decision output: q0.</p>
        <p>Full two-qubit distribution will remain visible.</p>
      </div>
    </section>
  </main>
</template>
