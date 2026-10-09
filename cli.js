#!/usr/bin/env node

const { configPath, loadConfig } = require('./src/config');
const { runRoutine } = require('./src/runner');
const { editConfig } = require('./src/editor');
const { createUi } = require('./src/ui');
const { closestMatch } = require('./src/suggestions');
const { completion } = require('./src/completions');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { installCompletion, uninstallCompletion, completionProfile, detectedShell } = require('./src/completions');
const readline = require('node:readline');
const packageInfo = require('./package.json');

const optionAliases = {
  '--dr': '--dry-run', '-dr': '--dry-run',
  '-V': '--verbose',
  '-q': '--quiet',
  '-nc': '--no-color',
  '-y': '--yes',
};

function printHelp() {
  const helpUi = createUi();
  console.log(`
${helpUi.bold('USAGE')}
  Run a configured routine by name, optionally passing arguments.
  
  yoink <routine> [arguments...]
  yoink <routine> [options]

${helpUi.bold('RUN OPTIONS')}
  Options that change how a routine runs or how much output it shows.

  --dry-run, -dr                  Show steps without executing them
  --yes, -y                       Skip confirmation prompts
  --verbose, -V                   Show commands and timing
  --quiet, -q                     Hide routine status output
  --no-color, -nc                 Disable colored output

${helpUi.bold('CONFIGURATION')}
  Commands for opening, checking, and locating the YAML configuration.

  yoink config                    Open and edit the global YAML configuration
  yoink config --validate         Check YAML without running routines
  yoink config --print-path       Print the active configuration path

${helpUi.bold('INFORMATION')}
  Commands for discovering routines and checking YOINK itself.

  yoink list                      List available routines and descriptions
  yoink doctor                    Check config, editor, shell, and paths
  yoink version                   Print the installed YOINK version
  yoink help                      Show this command reference

${helpUi.bold('COMPLETIONS')}
  Commands for enabling Tab completion in your shell.

  yoink completions <shell>       Print completion setup for a shell
  yoink completions install       Explain and install shell completion
  yoink completions uninstall     Remove YOINK completion setup

See yoink.example.yml for the YAML format.
`);
}

function executableAvailable(command) {
  if (!command) return false;
  const name = command.trim().split(/\s+/)[0].replace(/^['"]|['"]$/g, '');
  const checker = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(checker, [name], { stdio: 'ignore', shell: false }).status === 0;
}

function doctor(config, ui) {
  const checks = [];
  checks.push([true, `configuration loaded: ${configPath()}`]);
  checks.push([true, `platform: ${process.platform}, shell: ${process.env.SHELL || process.env.ComSpec || 'unknown'}`]);
  checks.push([true, `${Object.keys(config.commands).length} routine(s) available`]);
  if (config.editor) checks.push([executableAvailable(config.editor), `editor available: ${config.editor}`]);
  for (const [name, routine] of Object.entries(config.commands)) {
    for (const step of routine.steps) {
      if (Object.hasOwn(step, 'navigate')) {
        const target = path.resolve(process.cwd(), step.navigate.replace(/^~(?=$|[\\/])/, os.homedir()));
        checks.push([fs.existsSync(target) && fs.statSync(target).isDirectory(), `${name}: navigate path ${step.navigate}`]);
      }
    }
  }
  for (const [ok, label] of checks) console.log(`${ok ? ui.success('✓') : ui.failure('✗')} ${label}${ok ? '' : ' (check this before running)'}`);
  if (checks.some(([ok]) => !ok)) process.exitCode = 1;
}

async function main(argv) {
  argv = argv.map((argument) => optionAliases[argument] || argument);
  const dryRun = argv.includes('--dry-run');
  const noColor = argv.includes('--no-color');
  const quiet = argv.includes('--quiet');
  const verbose = argv.includes('--verbose');
  const yes = argv.includes('--yes') || argv.includes('-y');
  const [command, ...args] = argv.filter((argument) => !['--dry-run', '--no-color', '--quiet', '--verbose', '--yes', '-y'].includes(argument));
  const ui = createUi({ color: !noColor });
  if (!command || command === 'help' || command === '--help' || command === '-h') { printHelp(); return; }
  if (command === 'version' || command === '--version' || command === '-v') { console.log(packageInfo.version); return; }
  if (command === 'completions') {
    if (args[0] === 'install') {
      const shell = args[1];
      const target = shell || detectedShell();
      const completionSetup = completionProfile(shell);
      console.log(`\n${ui.bold('YOINK shell completion')}\n`);
      console.log(`${ui.info('Shell')}   ${target}`);
      console.log(`${ui.info('File')}    ${completionSetup.file}\n`);
      console.log(`${ui.bold('What is a shell startup file?')}`);
      console.log('It is a script your terminal reads whenever a new shell opens.\n');
      console.log(`${ui.bold('What will YOINK add?')}`);
      console.log('One marked block that enables Tab completion for YOINK commands:\n');
      console.log(ui.info(completionSetup.setup.trim()));
      console.log(`\n${ui.bold('What will not happen?')}`);
      console.log('No packages will be installed, routines will not run, and your YAML will not change.');
      console.log(`Remove this block later with: ${ui.info('yoink completions uninstall')}\n`);
      if (!yes) {
        if (!process.stdin.isTTY) throw new Error('confirmation required; rerun with --yes in a non-interactive shell');
        const answer = await new Promise((resolve) => {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl.question(`${ui.bold('Proceed with this change?')} [y/N] `, (value) => { rl.close(); resolve(/^y(es)?$/i.test(value.trim())); });
        });
        if (!answer) { console.log('Cancelled.'); return; }
      }
      const file = installCompletion(shell); console.log(`Shell completions installed in ${file}. Restart your shell or source that file.`); return;
    }
    if (args[0] === 'uninstall') {
      const shell = args[1];
      const profile = completionProfile(shell).file;
      console.log(`YOINK will remove only its marked completion block from: ${profile}`);
      if (!yes) {
        if (!process.stdin.isTTY) throw new Error('confirmation required; rerun with --yes in a non-interactive shell');
        const answer = await new Promise((resolve) => {
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl.question('Uninstall completion setup? [y/N] ', (value) => { rl.close(); resolve(/^y(es)?$/i.test(value.trim())); });
        });
        if (!answer) { console.log('Cancelled.'); return; }
      }
      const result = uninstallCompletion(shell);
      console.log(result.removed ? `Completion setup removed from ${result.file}.` : 'No YOINK completion setup was found.');
      return;
    }
    if (!args[0]) throw new Error('usage: yoink completions <zsh|bash|fish|powershell|install>');
    process.stdout.write(completion(args[0])); return;
  }
  if (command === 'list') {
    const config = loadConfig();
    const rows = Object.entries(config.commands).map(([name, routine]) => [name, routine.description || '—']);
    const nameWidth = Math.max('NAME'.length, ...rows.map(([name]) => name.length));
    const descriptionWidth = Math.max('DESCRIPTION'.length, ...rows.map(([, description]) => description.length));
    console.log('');
    console.log(`NAME${' '.repeat(nameWidth - 4)}  DESCRIPTION`);
    console.log(`${'-'.repeat(nameWidth)}  ${'-'.repeat(descriptionWidth)}`);
    for (const [name, description] of rows) console.log(`${name.padEnd(nameWidth)}  ${description}`);
    console.log('');
    return;
  }
  if (command === 'doctor') {
    const config = loadConfig();
    doctor(config, ui);
    return;
  }
  if (command === 'config') {
    if (args.length === 1 && args[0] === '--validate') { loadConfig(); console.log(`Configuration is valid: ${configPath()}`); return; }
    if (args.length === 1 && args[0] === '--print-path') { console.log(configPath()); return; }
    if (args.length) throw new Error('usage: yoink config [--validate|--print-path]');
    editConfig(configPath()); return;
  }
  if (!command) throw new Error('a command is required; use "config" to edit the configuration');
  const config = loadConfig();
  if (!config.commands[command]) {
    const suggestion = closestMatch(command, Object.keys(config.commands));
    throw new Error(`unknown command "${command}"${suggestion ? `. Did you mean "${suggestion}"?` : ''}`);
  }
  const routine = config.commands[command];
  if (routine.confirm && !dryRun && !yes) {
    if (!process.stdin.isTTY) throw new Error('confirmation required; rerun with --yes in a non-interactive shell');
    const answer = await new Promise((resolve) => {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(`Run "${command}"? [y/N] `, (value) => { rl.close(); resolve(/^y(es)?$/i.test(value.trim())); });
    });
    if (!answer) { console.log('Cancelled.'); return; }
  }
  runRoutine(routine, args, dryRun, { quiet, verbose });
}

let activeRoutine;
activeRoutine = process.argv.slice(2).map((argument) => optionAliases[argument] || argument).find((argument) => !['--dry-run', '--no-color', '--quiet', '--verbose', '--yes', 'config', '--validate', 'completions', 'install', 'uninstall'].includes(argument));
Promise.resolve(main(process.argv.slice(2))).catch((error) => {
  if (activeRoutine) {
    console.error(createUi({ color: !process.argv.includes('--no-color'), output: process.stderr }).failure(`✗ ${activeRoutine} failed`));
  }
  console.error(`YOINK: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { main };
