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
# Only package essential files (templates, README.md, *.yaml/*.yml, i18n, LICENSE, screenshot.*)
theme-package

# Package all files using .gitignore, always including essential paths
theme-package --all
# or
theme-package -a
```

### Packaging Rules

- By default, only packages essential files and directories:
  - templates directory
  - ui-plugin/dist directory
  - README.md
  - Root-level .yaml and .yml files
  - i18n directory
  - LICENSE file
  - Root-level `screenshot.png`, `screenshot.jpeg`, `screenshot.jpg`, or `screenshot.webp`

- When using `--all`:
  - Files are filtered using the project root `.gitignore`, including negation (`!`) rules. Nested `.gitignore` files and global Git ignore settings are not read.
  - All essential paths listed above are always included, even if the files or their parent directories are ignored, except for Git metadata. This includes the contents of `templates`, `ui-plugin/dist`, and `i18n`.
  - `.git` files and directories at any depth are always excluded, including those inside essential paths. Negation rules cannot override this exclusion.
  - Other exclusions come from `.gitignore`. Add directories such as `node_modules` and `dist` if they should be excluded.
  - Without a root `.gitignore`, all files are included except Git metadata and the current output ZIP.
  - The ZIP file currently being generated is always excluded to prevent the archive from including itself.

The default mode does not read `.gitignore` and retains its built-in exclusions. It also excludes `.git` files and directories at any depth.

## Development

Run `pnpm test` to test the CLI against temporary theme projects and inspect the generated ZIP files. The tests require `unzip` on your PATH.

## Requirements

- Node.js environment
- The theme project root directory must contain a properly formatted theme.yaml file

## License

MIT
