const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { validateConfig } = require('../src/config');
const { completion, detectedShell } = require('../src/completions');
const { commandWithArguments, shellQuote } = require('../src/runner');
const { closestMatch } = require('../src/suggestions');
const { createUi } = require('../src/ui');

test('validates the small YAML schema', () => {
  assert.doesNotThrow(() => validateConfig({ name: 'yoink', commands: { hello: { description: 'Say hello', steps: [{ run: 'echo hello', timeout: 2 }] } } }));
  assert.throws(() => validateConfig({ name: 'yoink', commands: { broken: { steps: [] } } }), /non-empty/);
  assert.throws(() => validateConfig({ name: 'yoink', commands: { broken: { steps: [{ run: 'false', timeout: 0 }] } } }), /positive/);
});

test('finds close routine names', () => {
  assert.equal(closestMatch('deply', ['deploy', 'release']), 'deploy');
  assert.equal(closestMatch('xyz', ['deploy', 'release']), undefined);
});

test('provides completion scripts for supported shells', () => {
  assert.match(completion('zsh'), /compdef/);
  assert.match(completion('bash'), /complete/);
  assert.match(completion('fish'), /complete -c yoink/);
  assert.throws(() => completion('cmd'), /unsupported shell/);
  assert.ok(['zsh', 'bash', 'fish', 'powershell'].includes(detectedShell()));
});

test('quotes arguments and expands portable placeholders', () => {
  assert.match(shellQuote("it's fine"), /it/);
  assert.match(commandWithArguments('echo {{1}}', ['hello world']), /echo/);
});

test('disables UI colors when output is not a terminal', () => {
  const output = { isTTY: false };
  assert.equal(createUi({ output }).success('ok'), 'ok');
});
