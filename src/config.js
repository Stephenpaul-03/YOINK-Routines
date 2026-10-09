const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yaml = require('js-yaml');

function configPath() {
  if (process.env.YOINK_CONFIG) return path.resolve(process.env.YOINK_CONFIG);
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'yoink', 'config.yml');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'yoink', 'config.yml');
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'yoink', 'config.yml');
}

function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('configuration must be a YAML object');
  if (typeof config.name !== 'string' || !/^[A-Za-z0-9_-]+$/.test(config.name)) throw new Error('"name" must be a CLI name containing only letters, numbers, underscores, or hyphens');
  if (config.editor !== undefined && (typeof config.editor !== 'string' || !config.editor.trim())) throw new Error('"editor" must be a non-empty command string');
  if (!config.commands || typeof config.commands !== 'object' || Array.isArray(config.commands)) throw new Error('"commands" must be an object of named routines');
  for (const [name, routine] of Object.entries(config.commands)) {
    if (!routine || typeof routine !== 'object' || Array.isArray(routine)) throw new Error(`command "${name}" must be an object`);
    if (!Array.isArray(routine.steps) || routine.steps.length === 0) throw new Error(`command "${name}" must contain a non-empty "steps" list`);
    if (routine.description !== undefined && (typeof routine.description !== 'string' || !routine.description.trim())) throw new Error(`command "${name}" description must be a non-empty string`);
    if (routine.confirm !== undefined && typeof routine.confirm !== 'boolean') throw new Error(`command "${name}" confirm must be true or false`);
    routine.steps.forEach((step, index) => {
      const keys = step && typeof step === 'object' && !Array.isArray(step) ? Object.keys(step) : [];
      if (keys.length < 1 || !['navigate', 'run'].includes(keys[0]) || keys.some((key) => !['navigate', 'run', 'timeout'].includes(key)) || typeof step[keys[0]] !== 'string' || !step[keys[0]].trim()) throw new Error(`command "${name}" step ${index + 1} must contain a non-empty "navigate" or "run" string`);
      if (step.timeout !== undefined && (!Number.isFinite(step.timeout) || step.timeout <= 0)) throw new Error(`command "${name}" step ${index + 1} timeout must be a positive number of seconds`);
    });
  }
}

function loadConfig() {
  const file = configPath();
  if (!fs.existsSync(file)) throw new Error(`configuration file not found at ${file}; run "yoink config" to create it`);
  let config;
  try { config = yaml.load(fs.readFileSync(file, 'utf8')); } catch (error) { throw new Error(`could not parse ${file}: ${error.message}`); }
  validateConfig(config);
  return config;
}

module.exports = { configPath, loadConfig, validateConfig };
