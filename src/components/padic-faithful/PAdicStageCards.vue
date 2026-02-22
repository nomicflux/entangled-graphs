<template>
  <section class="panel padic-stage-cards">
    <div class="panel-header">
      <h2>Faithful Stages</h2>
      <p>Operator/SOVM-first workflow in faithful mode.</p>
    </div>

    <div class="snapshot-grid">
      <article v-for="card in faithfulStageCards" :key="card.id" class="snapshot-card">
        <p class="snapshot-title">{{ card.title }}</p>
        <p class="snapshot-hint">{{ card.subtitle }}</p>
        <p class="snapshot-row">
          <span>primary</span>
          <span>{{ card.primary }}</span>
        </p>
        <p class="snapshot-row">
          <span>secondary</span>
          <span>{{ card.secondary }}</span>
        </p>
      </article>
    </div>

    <ul v-if="faithfulErrors.length > 0" class="padic-error-list">
      <li v-for="(entry, index) in faithfulErrors" :key="index">{{ entry }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { faithfulErrors, faithfulStageCards } from "../../padic-faithful";
</script>
