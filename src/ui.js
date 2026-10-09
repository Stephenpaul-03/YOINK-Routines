const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m',
};

function createUi({ color = true, output = process.stdout } = {}) {
  const enabled = color && !process.env.NO_COLOR && output.isTTY !== false;
  const paint = (name, text) => enabled ? `${colors[name]}${text}${colors.reset}` : text;
  return { enabled, success: (text) => paint('green', text), failure: (text) => paint('red', text), dry: (text) => paint('yellow', text), info: (text) => paint('cyan', text), bold: (text) => paint('bold', text) };
}

module.exports = { createUi };
