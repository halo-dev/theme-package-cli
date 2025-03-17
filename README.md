# @halo-dev/theme-package-cli

A command-line tool for packaging Halo theme template files, making them ready for distribution.

## Features

- Package Halo theme template files into a ZIP file
- Option to package all files or only essential files

## Installation

### Global Installation

```bash
npm install -g @halo-dev/theme-package-cli

# or

npx @halo-dev/theme-package-cli
```

### Local Installation

```bash
npm install @halo-dev/theme-package-cli
```

## Usage

Run the command in your Halo theme project root directory:

```bash
# Only package essential files (templates, README.md, *.yaml/*.yml, i18n, LICENSE)
theme-package

# Package all files (excluding node_modules, dist, etc.)
theme-package --all
# or
theme-package -a
```

### Packaging Rules

- By default, only packages essential files and directories:
  - templates directory
  - README.md
  - All .yaml and .yml files
  - i18n directory
  - LICENSE file

- When using the `--all` parameter, packages all files in the project, excluding:
  - node_modules directory
  - dist directory
  - .git directory
  - .github directory
  - .idea directory
  - .vscode directory
  - .husky directory
  - Lock files (pnpm-lock.yaml, package-lock.json, yarn.lock, bun.lockb)
  - .DS_Store files

## Requirements

- Node.js environment
- The theme project root directory must contain a properly formatted theme.yaml file

## License

MIT
