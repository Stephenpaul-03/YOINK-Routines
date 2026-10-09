const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.join(__dirname, '..');
const cli = path.join(root, 'cli.js');

function fixture(contents) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yoink-test-'));
  const file = path.join(directory, 'config.yml');
  fs.writeFileSync(file, contents);
  return { directory, file };
}

function run(file, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env, YOINK_CONFIG: file } });
}

test('runs a routine and forwards positional arguments', () => {
  const { file } = fixture('name: yoink\ncommands:\n  greet:\n    steps:\n      - run: \'printf "hello %s\\n" "$1"\'\n');
  const result = run(file, 'greet', 'world', '--verbose');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /hello world/);
  assert.match(result.stdout, /✓ complete/);
});

test('dry run does not execute commands', () => {
  const setup = fs.mkdtempSync(path.join(os.tmpdir(), 'yoink-test-'));
  const target = path.join(setup, 'should-not-exist');
  const { file } = fixture('name: yoink\ncommands:\n  dry:\n    steps:\n      - run: "node -e \\\"process.exit(1)\\\""\n');
  const result = run(file, 'dry', '--dry-run');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /… run/);
  assert.equal(fs.existsSync(target), false);
});

test('stops on failure and reports MISSED', () => {
  const { file } = fixture('name: yoink\ncommands:\n  broken:\n    steps:\n      - run: "false"\n');
  const result = run(file, 'broken');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /✗ broken failed/);
});

test('config validate accepts a valid config and rejects an invalid one', () => {
  const valid = fixture('name: yoink\ncommands:\n  hello:\n    steps:\n      - run: "echo hello"\n');
  assert.equal(run(valid.file, 'config', '--validate').status, 0);
  const invalid = fixture('name: yoink\ncommands:\n  hello:\n    steps: []\n');
  assert.notEqual(run(invalid.file, 'config', '--validate').status, 0);
});

test('supports close-command suggestions and clean output', () => {
  const { file } = fixture('name: yoink\ncommands:\n  status:\n    steps:\n      - run: "echo ok"\n');
  const result = run(file, 'stats');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Did you mean "status"/);
  const hidden = run(file, 'status');
  assert.equal(hidden.status, 0);
  assert.doesNotMatch(hidden.stdout, /status complete/);
});

test('supports confirmation and step timeouts', () => {
  const { file } = fixture('name: yoink\ncommands:\n  protected:\n    confirm: true\n    steps:\n      - run: "echo safe"\n        timeout: 2\n');
  const result = run(file, 'protected');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /confirmation required/);
});

test('lists routines as an uncolored table', () => {
  const { file } = fixture('name: yoink\ncommands:\n  hello:\n    description: Say hello\n    steps:\n      - run: "true"\n');
  const result = run(file, 'list');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /NAME\s+DESCRIPTION/);
  assert.match(result.stdout, /hello\s+Say hello/);
  assert.doesNotMatch(result.stdout, /\x1b\[/);
});
