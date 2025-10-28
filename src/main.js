// src/main.js
import { createApp } from 'vue';
import App from './App.vue';

import { Amplify } from 'aws-amplify';
import awsconfig from './aws-exports';

// Configure Amplify (Auth only for now; PubSub provider added in the component)
Amplify.configure(awsconfig);

createApp(App).mount('#app');
