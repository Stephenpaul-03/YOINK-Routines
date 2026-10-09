const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const scripts = {
  zsh: 'autoload -Uz compinit && compinit\n_yOink() { _describe command "(config list doctor help version completions)"; }\ncompdef _yOink yoink\n',
  bash: '_yoink_completions() { COMPREPLY=($(compgen -W "config list doctor help version completions" -- "${COMP_WORDS[1]}")); }\ncomplete -F _yoink_completions yoink\n',
  fish: 'complete -c yoink -f -a "config list doctor help version completions"\n',
  powershell: "Register-ArgumentCompleter -CommandName yoink -ScriptBlock { param($wordToComplete) 'config','list','doctor','help','version','completions' | Where-Object { $_ -like \"$wordToComplete*\" } }\n",
};
function completion(shell) { if (!scripts[shell]) throw new Error(`unsupported shell "${shell}"; choose zsh, bash, fish, or powershell`); return scripts[shell]; }

function detectedShell() {
  const shell = path.basename(process.env.SHELL || '').toLowerCase();
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('fish')) return 'fish';
  if (shell.includes('pwsh') || process.platform === 'win32') return 'powershell';
  return 'bash';
}

function installCompletion(shell = detectedShell()) {
  const { file, setup } = completionProfile(shell);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!existing.includes('# YOINK shell completion')) fs.appendFileSync(file, `${existing.endsWith('\n') || !existing ? '' : '\n'}${setup}`);
  return file;
}

function completionProfile(shell = detectedShell()) {
  const marker = '# YOINK shell completion';
  let file;
  let setup;
  if (shell === 'zsh') {
    file = path.join(os.homedir(), '.zshrc');
    setup = `${marker}\neval "$(yoink completions zsh)"\n`;
  } else if (shell === 'bash') {
    file = path.join(os.homedir(), '.bashrc');
    setup = `${marker}\neval "$(yoink completions bash)"\n`;
  } else if (shell === 'fish') {
    file = path.join(os.homedir(), '.config', 'fish', 'config.fish');
    setup = `${marker}\nyoink completions fish | source\n`;
  } else if (shell === 'powershell') {
    file = process.env.PS_PROFILE || path.join(os.homedir(), 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
    setup = `${marker}\nyoink completions powershell | Invoke-Expression\n`;
  } else throw new Error(`unsupported shell "${shell}"; choose zsh, bash, fish, or powershell`);
  return { file, setup };
}

function uninstallCompletion(shell = detectedShell()) {
  const { file, setup } = completionProfile(shell);
  if (!fs.existsSync(file)) return { file, removed: false };
  const existing = fs.readFileSync(file, 'utf8');
  if (!existing.includes('# YOINK shell completion')) return { file, removed: false };
  fs.writeFileSync(file, existing.replace(`\n${setup}`, '').replace(setup, ''));
  return { file, removed: true };
}

module.exports = { completion, detectedShell, installCompletion, uninstallCompletion, completionProfile };

