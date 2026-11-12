#!/usr/bin/env node
/**
 * CM-LAB E2E Test Suite Node.js Master Runner Wrapper
 * Author: teamwork_test_writer_e2e_1
 * License: MIT / Academic Use (SRH University of Applied Sciences, CM-LAB WiSe 2026)
 *
 * Runs the E2E test suite across all 4 tiers via child_process.
 */

const { spawn } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const pythonRunner = path.join(repoRoot, 'tests', 'e2e', 'runner.py');

const args = [pythonRunner, ...process.argv.slice(2)];

const child = spawn('python', args, {
  cwd: repoRoot,
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error(`Failed to launch Python test runner: ${err.message}`);
  process.exit(1);
});
