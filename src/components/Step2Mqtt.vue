<script setup>
import { ref, onBeforeUnmount } from "vue";
import mqtt from "mqtt";                       // ✅ use the package entry
import { runStep1 } from "../awsAuth";
import { getAwsCredentials } from "../awsCreds";
import { AWS_REGION } from "../awsConfig";
import { buildPresignedUrl } from "../iotSigv4";

const status = ref("idle");
const messages = ref([]);
let client = null;

async function startMqtt() {
  status.value = "initializing...";
  try {
    // Step 1: identity + clientId + endpoint
    const { identityId, clientId, wssEndpoint } = await runStep1();
    // Temporary AWS creds (AKID/SECRET/SESSION)
    const creds = await getAwsCredentials();

    // Build SigV4-presigned WSS URL
    const url = await buildPresignedUrl({
      region: AWS_REGION,
      endpointWss: wssEndpoint,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
      },
    });

    // Connect via MQTT.js
    status.value = "connecting...";
    client = mqtt.connect(url, {
      clientId,              // must start with identityId (your IoT policy rule)
      protocolVersion: 4,
      clean: true,
    });

    client.on("connect", () => {
      status.value = "connected";

      const topic = `users/${identityId}/#`;
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) status.value = `subscribe error: ${err.message || err}`;
      });

      // optional hello
      client.publish(
        `users/${identityId}/hello`,
        JSON.stringify({ hi: "from web (mqtt.js)" }),
        { qos: 1 }
      );
    });

    client.on("message", (topic, payload) => {
      const text = new TextDecoder().decode(payload);
      const line = `[${new Date().toLocaleTimeString()}] ${topic}: ${text}`;
      messages.value.unshift(line);
    });

    client.on("error", (err) => {
      status.value = `error: ${err?.message || String(err)}`;
    });

    client.on("close", () => {
      if (status.value !== "disconnected") status.value = "closed";
    });

  } catch (e) {
    console.error(e);
    status.value = `error: ${e?.message || String(e)}`;
  }
}

function disconnect() {
  if (client) {
    client.end(true);
    client = null;
    status.value = "disconnected";
  }
}

onBeforeUnmount(disconnect);
</script>

<template>
  <div style="padding:1rem;">
    <div><strong>Status:</strong> {{ status }}</div>
    <div style="margin:1rem 0;">
      <button @click="startMqtt">Connect</button>
      <button @click="disconnect">Disconnect</button>
    </div>
    <div style="font-weight:600; margin:.5rem 0;">Messages</div>
    <div v-for="m in messages" :key="m" style="font-family:ui-monospace, Menlo, Consolas, monospace;">
      {{ m }}
    </div>
  </div>
</template>
