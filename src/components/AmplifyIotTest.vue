<!-- src/components/AmplifyIotTest.vue -->
<template>
    <div style="font-family: system-ui; max-width: 720px; margin: 1rem auto; line-height: 1.4;">
      <h2>AWS IoT via Amplify — Unauth Test</h2>
  
      <div style="padding: .5rem; background: #f6f6f9; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div><b>Identity ID:</b> {{ identityId || '—' }}</div>
        <div><b>Client ID (IoT):</b> {{ clientId || '—' }}</div>
        <div><b>WSS Endpoint:</b> {{ endpoint }}</div>
        <div><b>Status:</b> {{ status }}</div>
      </div>
  
      <div style="margin: .75rem 0;">
        <button @click="getCreds" :disabled="busy">1) Get creds</button>
        <button @click="connectIot" :disabled="busy || !identityId">2) Connect</button>
        <button @click="disconnectIot" :disabled="!connected">Disconnect</button>
        <button @click="debugRawWs" :disabled="busy || !identityId">Debug Raw WS</button>
      </div>
  
      <div v-if="messages.length" style="margin-top: .75rem;">
        <b>Messages:</b>
        <ul>
          <li v-for="(m,i) in messages" :key="i">{{ m }}</li>
        </ul>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import awsconfig from '../aws-exports';
  
  // ✅ Correct imports for Amplify v5
  import { Auth, PubSub } from 'aws-amplify';
  import { AWSIoTProvider } from '@aws-amplify/pubsub';
  
  const status = ref('idle');
  const busy = ref(false);
  const identityId = ref('');
  const clientId = ref('');
  const endpoint = awsconfig.aws_pubsub_endpoint; // must include /mqtt
  const connected = ref(false);
  const messages = ref([]);
  
  let subscription = null;
  
  // 1) Get unauth credentials (Cognito Identity)
  async function getCreds() {
    busy.value = true;
    status.value = 'initializing';
    try {
      const creds = await Auth.currentCredentials(); // unauth guest creds
      if (!creds || !creds.identityId) throw new Error('No identityId from Cognito');
      identityId.value = creds.identityId;
      clientId.value = `${creds.identityId}-web`;
  
      status.value = 'creds_ok';
      console.log('Cognito creds:', {
        identityId: creds.identityId,
        accessKeyId: creds.accessKeyId,
        hasSessionToken: !!creds.sessionToken,
      });
    } catch (e) {
      console.error('Get creds failed:', e);
      status.value = `error: ${e.message || e}`;
    } finally {
      busy.value = false;
    }
  }
  
  // 2) Connect to IoT over WSS with Amplify’s AWSIoTProvider
  async function connectIot() {
    if (!identityId.value) {
      status.value = 'error: run step 1 first';
      return;
    }
  
    busy.value = true;
    status.value = 'connecting';
  
    try {
      // Remove an existing provider if present (idempotent)
      try { PubSub.removePluggable('AWSIoTProvider'); } catch {}
  
      // Add provider
      PubSub.addPluggable(new AWSIoTProvider({
        aws_pubsub_region: 'eu-central-1',
        aws_pubsub_endpoint: endpoint, // e.g. wss://.../mqtt
        clientId: clientId.value,      // must match any ClientId condition in your IoT policy
      }));
  
      const topic = `EmbeddIA/telemetry`;
      messages.value.push(`Subscribing to: ${topic}`);
  
      subscription = PubSub.subscribe(topic).subscribe({
        next: data => {
          connected.value = true;
          status.value = 'connected';
          messages.value.push(`Received: ${JSON.stringify(data.value)}`);
        },
        error: err => {
          status.value = `error: ${err?.message || err}`;
          console.error('Sub error:', err);
        },
        complete: () => {
          messages.value.push('Sub complete');
        },
      });
  
      // Publish a test message after a short delay
      setTimeout(async () => {
        try {
          await PubSub.publish(topic, { hello: 'amplify_mqtt', t: Date.now() });
          messages.value.push('Published test message');
        } catch (e) {
          messages.value.push(`Publish error: ${e.message || e}`);
          console.error('Publish error:', e);
        }
      }, 1200);
  
    } catch (e) {
      status.value = `error: ${e.message || e}`;
      console.error('Connect failed:', e);
    } finally {
      busy.value = false;
    }
  }
  
  function disconnectIot() {
    try {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
      try { PubSub.removePluggable('AWSIoTProvider'); } catch {}
    } finally {
      connected.value = false;
      status.value = 'closed';
    }
  }
  
  // --- Optional: raw WS presign for diagnostics ---
  import { SignatureV4 } from '@aws-sdk/signature-v4';
  import { Sha256 } from '@aws-crypto/sha256-js';
  import { HttpRequest } from '@aws-sdk/protocol-http';
  
  async function debugRawWs() {
    try {
      const creds = await Auth.currentCredentials();
      const url = await buildPresignedUrl(creds);
      console.log('DEBUG URL:', url);
      const ws = new WebSocket(url, ['mqtt']);
      ws.onopen = () => { console.log('RAW WS open'); alert('RAW WS open'); };
      ws.onerror = (e) => console.log('RAW WS error', e);
      ws.onclose = (e) => alert(`RAW WS closed code=${e.code} reason=${e.reason || '(none)'}`);
    } catch (e) {
      alert(`Raw WS failed: ${e.message || e}`);
    }
  }
  
  async function buildPresignedUrl(creds) {
    const region = 'eu-central-1';
    const host = new URL(endpoint).hostname;
    const path = '/mqtt';
  
    const signer = new SignatureV4({
      service: 'iotdevicegateway',
      region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      },
      sha256: Sha256,
    });
  
    const req = new HttpRequest({
      protocol: 'https:',
      method: 'GET',
      hostname: host,
      path,
      headers: { host },
      query: {},
    });
  
    const signed = await signer.presign(req, { expiresIn: 900 });
    signed.query = signed.query || {};
    signed.query['X-Amz-Security-Token'] = creds.sessionToken;
    const qs = new URLSearchParams(signed.query).toString();
    return `wss://${host}${path}?${qs}`;
  }
  </script>
  
  <style scoped>
  button {
    margin-right: .5rem;
    padding: .4rem .7rem;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: white;
    cursor: pointer;
  }
  button:disabled { opacity: .5; cursor: not-allowed; }
  </style>
  