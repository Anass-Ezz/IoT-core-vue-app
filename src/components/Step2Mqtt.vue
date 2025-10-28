<script setup>
// ... existing imports/vars
import { buildPresignedUrl } from "../iotSigv4";
import { AWS_REGION } from "../awsConfig";
import { runStep1 } from "../awsAuth";
import { getAwsCredentials } from "../awsCreds";

// ADD THIS
async function debugRawWs() {
  try {
    const { identityId, wssEndpoint } = await runStep1();
    const creds = await getAwsCredentials();
    const url = await buildPresignedUrl({
      region: AWS_REGION,
      endpointWss: wssEndpoint,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      },
    });

    console.log("RAW WS URL:", url);
    const ws = new WebSocket(url, ['mqtt']); // IMPORTANT: subprotocol 'mqtt'
    ws.onopen = () => console.log("RAW WS: open");
    ws.onerror = (e) => console.log("RAW WS: error", e);
    ws.onclose = (e) => {
      console.log("RAW WS: close", { code: e.code, reason: e.reason });
      alert(`WS closed. code=${e.code} reason=${e.reason || '(empty)'} `);
    };
  } catch (e) {
    console.error("RAW WS debug failed:", e);
    alert(`RAW WS debug failed: ${e.message || e}`);
  }
}
</script>

<template>
  <!-- ... your existing template -->
  <div style="margin:1rem 0;">
    <button @click="startMqtt">Connect</button>
    <button @click="disconnect">Disconnect</button>
    <!-- ADD THIS -->
    <button @click="debugRawWs">Debug Raw WS</button>
  </div>
  <!-- ... -->
</template>
