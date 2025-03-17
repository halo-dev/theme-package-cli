#!/usr/bin/env node

const { program } = require("commander");
const yaml = require("js-yaml");
const archiver = require("archiver");
const fs = require("fs-extra");
const path = require("path");
const package = require("./package.json");

const ignorePatterns = [
  "node_modules/**",
  "dist/**",
  ".husky",
  ".git/**",
  ".github/**",
  ".idea/**",
  ".vscode/**",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  "bun.lockb",
  ".DS_Store",
  "./**/.DS_Store",
];

const essentialPaths = [
  "templates/**",
  "README.md",
  "LICENSE",
  "i18n/**",
  "*.yaml",
  "*.yml",
];

program
  .version(package.version)
  .description("A CLI tool for packaging Halo theme template files");

program.option(
  "-a, --all",
  "Package all files, excluding some unnecessary directories and files",
  false
);

program.parse(process.argv);
const options = program.opts();

async function main() {
  try {
    const themeYamlPath = path.join(process.cwd(), "theme.yaml");
    if (!fs.existsSync(themeYamlPath)) {
      console.error(
        "Error: theme.yaml file not found in the current directory"
      );
      process.exit(1);
    }

    const themeYamlContent = fs.readFileSync(themeYamlPath, "utf8");
    const themeConfig = yaml.load(themeYamlContent);

    if (
      !themeConfig.metadata ||
      !themeConfig.metadata.name ||
      !themeConfig.spec ||
      !themeConfig.spec.version
    ) {
      console.error(
        "Error: theme.yaml file format is incorrect, missing required fields"
      );
      process.exit(1);
    }

    const distDir = path.join(process.cwd(), "dist");
    await fs.ensureDir(distDir);

    const zipFileName = `${themeConfig.metadata.name}-${themeConfig.spec.version}.zip`;
    const zipFilePath = path.join(distDir, zipFileName);

    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    output.on("close", function () {
      console.log(`✅ Packaged successfully: ${zipFilePath}`);
      console.log(`Theme version: ${themeConfig.spec.version}`);
      console.log(
        `File size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`
      );
    });

    archive.on("error", function (err) {
      throw err;
    });

    archive.pipe(output);

    if (options.all) {
      archive.glob("**/*", {
        cwd: process.cwd(),
        ignore: ignorePatterns,
        dot: true,
      });
    } else {
      essentialPaths.forEach((pattern) => {
        archive.glob(pattern, {
          cwd: process.cwd(),
          ignore: ignorePatterns,
          dot: true,
        });
      });
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
