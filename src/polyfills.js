// Strong polyfills for Node-ish globals (must load before main.js)
import { Buffer as SafeBuffer } from 'safe-buffer';
import process from 'process';

const g = window;

// Some libs expect "global"
if (!g.global) g.global = g;

// Use safe-buffer's Buffer (guarantees Buffer.from/Buffer.alloc)
if (!g.Buffer) g.Buffer = SafeBuffer;

// Minimal process shim
if (!g.process) g.process = process;
if (!g.process.env) g.process.env = {};
