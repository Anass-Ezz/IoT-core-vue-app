<script setup lang="ts">
import Step1GetCreds from "./components/Step1GetCreds.vue";
import Step2Mqtt from "./components/Step2Mqtt.vue";
</script>

<template>
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
    <h1 style="font-size:1.5rem; margin:1rem;">AWS IoT — Step 1 & Step 2</h1>
    <Step1GetCreds />
    <hr />
    <Step2Mqtt />
  </div>
</template>
