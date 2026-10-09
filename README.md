# YOINK — Your Own Interactive Navigation Kit

YOINK turns repetitive shell commands into named YAML routines. Define them once, run them by name, and stop typing the same five commands for the 400th time.

```bash
yoink deploy
yoink commit "fix login bug"
```

No elaborate scripting framework. No unnecessary complexity. Just my attempt to make terminal life a little less repetitive.

## The idea

YOINK is for commands I type so often that remembering them has become unpaid administrative work.

Define a routine. Give it a name. Run it when needed.

No framework to learn. No server to maintain. Just my commands, organized for reuse.

**Stop typing the same commands. Yoink them.**

---

## Install

### From the repository

```bash
npm install
npm link
yoink config
```

`npm link` creates a global link to my local checkout, so changes take effect immediately.

Just remember which directory you're editing. YOINK automates commands, not accountability.

### From npm

```bash
npm install --global yoink-routines
```

Then use it anywhere:

```bash
yoink config
yoink list
```

The package is `yoink-routines`; the command is `yoink`. Different names, same administrative inconvenience.

`yoink config` creates the configuration file if needed and opens it in the preferred editor. No manual directory creation required.

### Configuration location

| Platform | Location |
|---|---|
| macOS | `~/Library/Application Support/yoink/config.yml` |
| Linux | `~/.config/yoink/config.yml` |
| Windows | `%APPDATA%/yoink/config.yml` |

Set `YOINK_CONFIG` to use a specific file instead:

```bash
YOINK_CONFIG="$PWD/work.yml" yoink deploy
```

Export it to persist the override in your current shell. YOINK reads the specified file; it doesn't copy, merge, or negotiate between configurations.

---

## Configuration

Define routines in YAML:

```yaml
name: yoink
editor: code

commands:
  hello:
    description: Say hello
    steps:
      - run: 'echo "Hello, $1"'

  deploy:
    confirm: true
    steps:
      - navigate: ~/projects/api
      - run: npm test
        timeout: 120
      - run: npm run build
```

Run a routine with:

```bash
yoink hello world
yoink deploy --dry-run
```

Steps execute in order and stop on failure. Arguments are available as `$1`, `$2`, and so on. Set `confirm: true` to require confirmation, or use `--yes` to skip it.

YOINK isn't a programming language. My shell already has one. Let's not make this weird.

### Editing configuration

Open the active configuration:

```bash
yoink config
```

The `editor` setting accepts commands such as `code`, `cursor --wait`, `vim`, or `nano`. If unavailable, YOINK falls back to `VISUAL`, then `EDITOR`, then the platform default.

Validate without running routines:

```bash
yoink config --validate
```

Print the active configuration path:

```bash
yoink config --print-path
```

The YAML defines what YOINK knows. `yoink config` opens the file where I tell it what to do.

One is the recipe; the other is the cupboard. Neither makes dinner.

---

## Commands

| Command | Description |
|---|---|
| `yoink <name> [args...]` | Run a routine |
| `yoink <name> --dry-run` | Preview a routine |
| `yoink list` | List routines |
| `yoink doctor` | Check configuration, editor, shell, and paths |
| `yoink config` | Open configuration |
| `yoink config --validate` | Validate configuration |
| `yoink config --print-path` | Print configuration path |
| `yoink help` | Show command reference |
| `yoink version` | Show version |
| `yoink completions install` | Install shell completion |
| `yoink completions uninstall` | Remove shell completion |

**Flags**

- `--dry-run`, `-dr` — Preview steps.
- `--verbose`, `-V` — Show commands and timing.
- `--quiet`, `-q` — Suppress normal routine UI.
- `--no-color`, `-nc` — Disable colored output.
- `--yes`, `-y` — Skip confirmations.

## Output

YOINK displays command output and stays out of the way.

Use `--dry-run` to preview, `--verbose` for commands and timing, or `--quiet` to suppress normal routine UI.

No elaborate output configuration. The shell already has an interface, and it was here first.

---

## Choose the command name

Change the executable in `package.json`:

```json
{
  "bin": {
    "your-command": "./cli.js"
  }
}
```

Then run `npm link` again.

The YAML `name` identifies the configuration; `bin` determines the executable.

---

## Shell completion

Install completion with:

```bash
yoink completions install
```

YOINK explains the profile change and asks for confirmation. It adds a marked block without installing packages, running routines, or modifying the YAML.

Remove it with:

```bash
yoink completions uninstall
```

Use `--yes` to skip confirmation when appropriate.

Completion currently covers the CLI. Completion for individual routine names is planned.

---

## Development and release

```bash
npm install
npm test
npm pack --dry-run
```

Release with:

```bash
npm version patch
npm publish
```

YOINK is MIT licensed.

Shell commands depend on the host shell, so Unix utilities such as `lsof` and `xargs` may need Windows/PowerShell equivalents.

YOINK runs commands. It doesn't magically make Linux commands native to Windows.

---

## What's planned

- **Project-level configuration** for repository-specific routines.
- **Better terminal output** with clearer progress and failure reporting.
- **Interactive routine selection** for browsing and choosing commands.
- **Stronger Windows and PowerShell support.**
- **Routine-name completion** beyond built-in commands.

The name promises an *Interactive Navigation Kit*. Today, it's primarily a YAML-driven command runner. The interactive part is catching up with the branding.

I'd rather ship a useful tool than an impressive list of promises.