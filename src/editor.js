const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { shellQuote } = require('./runner');

function editConfig(file, configuredEditor) {
  fs.mkdirSync(require('node:path').dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, 'name: yoink\n\ncommands:\n  example:\n    steps:\n      - run: echo hello\n');
  let editor = configuredEditor;
  if (!editor) {
    try {
      const yaml = require('js-yaml');
      const parsed = yaml.load(fs.readFileSync(file, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) editor = parsed.editor;
    } catch (error) { throw new Error(`could not parse ${file}: ${error.message}`); }
  }
  editor = editor || process.env.VISUAL || process.env.EDITOR || (process.platform === 'win32' ? 'notepad' : 'vi');
  let result = spawnSync(`${editor} ${shellQuote(file)}`, { stdio: 'inherit', shell: true });
  if (result.status === 127 || result.error) {
    const fallback = process.platform === 'darwin' ? `open -t ${shellQuote(file)}` : process.platform === 'win32' ? `notepad ${shellQuote(file)}` : `vi ${shellQuote(file)}`;
    console.error(`YOINK: editor "${editor}" was not found; opening the file with a fallback editor.`);
    result = spawnSync(fallback, { stdio: 'inherit', shell: true });
  }
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

module.exports = { editConfig };
