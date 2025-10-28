// src/aws-exports.js
export default {
    // ----- Cognito (Identity Pool for unauth) -----
    Auth: {
      identityPoolId: 'eu-central-1:9131ed6a-a1af-45fb-96d1-2053a5e02875', // <-- paste your Identity Pool Id
      region: 'eu-central-1',
    },
  
    // ----- PubSub (AWS IoT Core) -----
    // region for IoT service (usually same as Cognito region)
    aws_pubsub_region: 'eu-central-1',
  
    // Your WSS endpoint EXACTLY as shown in AWS IoT > Settings (with /mqtt)
    // Example from your message:
    aws_pubsub_endpoint: 'wss://a31rt1i47njxwc-ats.iot.eu-central-1.amazonaws.com/mqtt',
  };
  