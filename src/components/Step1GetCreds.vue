<script setup lang="ts">
import { ref } from "vue";
import { runStep1 } from "../awsAuth";

const loading = ref(false);
const error = ref<string | null>(null);
const identityId = ref<string | null>(null);
const clientId = ref<string | null>(null);
const wssEndpoint = ref<string | null>(null);

async function start() {
  loading.value = true;
  error.value = null;
  try {
    const out = await runStep1();
    identityId.value = out.identityId;
    clientId.value = out.clientId;
    wssEndpoint.value = out.wssEndpoint;
    console.log("Step1 result:", out);
  } catch (e: any) {
    console.error(e);
    error.value = e?.message || String(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-4 space-y-3">
    <button @click="start" :disabled="loading" style="padding:.5rem 1rem; border-radius:.5rem; background:#eee;">
      {{ loading ? "Working..." : "Run Step 1 (Get creds + attach policy + endpoint)" }}
    </button>

    <div v-if="error" style="color:#b00020;">Error: {{ error }}</div>

    <div v-if="identityId" class="space-y-1">
      <div><strong>Identity ID:</strong> {{ identityId }}</div>
      <div><strong>Client ID (for MQTT next step):</strong> {{ clientId }}</div>
      <div><strong>WSS Endpoint:</strong> {{ wssEndpoint }}</div>
    </div>
  </div>
</template>
