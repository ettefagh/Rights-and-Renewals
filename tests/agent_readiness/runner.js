#!/usr/bin/env node
/**
 * Node.js Wrapper for CM-LAB Agent Readiness E2E Test Suite.
 * Forwards arguments directly to Python 3 test runner.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pythonScript = join(__dirname, 'runner.py');
const args = [pythonScript, ...process.argv.slice(2)];

const child = spawn('python', args, { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
