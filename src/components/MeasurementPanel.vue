<template>
  <section class="panel">
    <div class="panel-header">
      <h2>Measurement</h2>
      <p>Click to sample the circuit output (sampling lands in Phase 2).</p>
    </div>

    <div class="measurement-card">
      <button class="measure-btn" disabled>Measure</button>
      <div class="measurement-readout">
        <div class="readout-row">
          <span class="label">Outcome</span>
          <span class="value">--</span>
        </div>
        <div class="readout-row">
          <span class="label">Probability</span>
          <span class="value">--</span>
        </div>
      </div>
    </div>

    <div class="history">
      <h3>Recent Samples</h3>
      <p class="muted">Measurements will appear here once sampling is wired up.</p>
    </div>
  </section>
</template>
