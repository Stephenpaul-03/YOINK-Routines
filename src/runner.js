const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function shellQuote(value) { return `'${String(value).replace(/'/g, `'"'"'`)}'`; }
function windowsQuote(value) { return `"${String(value).replace(/(["^%])/g, '^$1')}"`; }
function commandWithArguments(command, args) {
  if (process.platform === 'win32') return command.replace(/\$([0-9]+)|\{\{([0-9]+)\}\}/g, (_, dollar, braces) => windowsQuote(args[Number(dollar || braces) - 1] || ''));
  return `set -- ${args.map(shellQuote).join(' ')}; ${command}`;
}

function runRoutine(routine, args, dryRun, options = {}) {
  const log = options.log || console.log;
  const quiet = options.quiet || false;
  const verbose = options.verbose || false;
  let cwd = process.cwd();
  for (const [index, step] of routine.steps.entries()) {
    const started = Date.now();
    if (Object.hasOwn(step, 'navigate')) {
      const destination = path.resolve(cwd, step.navigate.replace(/^~(?=$|[\\/])/, os.homedir()));
      if (!fs.existsSync(destination) || !fs.statSync(destination).isDirectory()) throw new Error(`cannot navigate to ${step.navigate}`);
      cwd = destination;
      if (!quiet && (dryRun || verbose)) log(`${dryRun ? '…' : '›'} navigate ${destination}`);
      continue;
    }
    if (dryRun) { if (!quiet) log(`… run ${step.run}`); continue; }
    if (!quiet && verbose) log(`› ${step.run}`);
    const stdio = quiet ? ['ignore', 'ignore', 'pipe'] : verbose ? 'inherit' : ['ignore', 'inherit', 'pipe'];
    const result = spawnSync(commandWithArguments(step.run, args), { cwd, stdio, shell: true, timeout: step.timeout ? step.timeout * 1000 : undefined });
    if (result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM') throw new Error(`step ${index + 1} timed out after ${step.timeout} seconds`);
    if (result.error) throw result.error;
    if (result.status !== 0) {
      if (result.stderr?.length) process.stderr.write(result.stderr);
      throw new Error(`step ${index + 1} failed with exit status ${result.status || 1}`);
    }
    if (!quiet && verbose) log(`  ✓ complete (${Date.now() - started}ms)`);
  }
}

module.exports = { runRoutine, shellQuote, commandWithArguments };
