#!/usr/bin/env node

import path from "path";

import archiver from "archiver";
import { program } from "commander";
import fs from "fs-extra";
import ignore from "ignore";
import yaml from "js-yaml";
import picomatch from "picomatch";

const packageJson = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const ignorePatterns = [
  "dist/**",
  "node_modules/**",
  "**/node_modules/**",
  "**/.git",
  "**/.git/**",
  ".github/**",
  ".idea/**",
  ".DS_Store",
  "**/.DS_Store",
];

const essentialPaths = [
  "templates/**",
  "ui-plugin/dist/**",
  "README.md",
  "LICENSE",
  "i18n/**",
  "*.yaml",
  "*.yml",
  "screenshot.png",
  "screenshot.jpeg",
  "screenshot.jpg",
  "screenshot.webp",
];

program
  .version(packageJson.version)
  .description("A CLI tool for packaging Halo theme template files");

program.option(
  "-a, --all",
  "Package all files using .gitignore, always including essential paths",
  false,
);

program.parse(process.argv);
const options = program.opts();

async function main() {
  try {
    const themeYamlPath = path.join(process.cwd(), "theme.yaml");
    if (!(await fs.pathExists(themeYamlPath))) {
      console.error("Error: theme.yaml file not found in the current directory");
      process.exit(1);
    }

    const themeYamlContent = await fs.readFile(themeYamlPath, "utf8");
    const themeConfig = yaml.load(themeYamlContent);

    if (
      !themeConfig?.metadata ||
      !themeConfig.metadata.name ||
      !themeConfig.spec ||
      !themeConfig.spec.version
    ) {
      console.error("Error: theme.yaml file format is incorrect, missing required fields");
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
      console.log(`File size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    });

    archive.on("error", function (err) {
      throw err;
    });

    archive.pipe(output);

    if (options.all) {
      const isEssential = picomatch(essentialPaths, { dot: true });
      const gitignore = ignore();
      const gitignorePath = path.join(process.cwd(), ".gitignore");
      if (await fs.pathExists(gitignorePath)) {
        gitignore.add(await fs.readFile(gitignorePath, "utf8"));
      }

      archive.directory(process.cwd(), false, (entry) => {
        const name = entry.name.split(path.sep).join("/");
        // Never include the archive being written in itself.
        if (path.resolve(process.cwd(), entry.name) === zipFilePath) {
          return false;
        }
        if (name.split("/").includes(".git")) {
          return false;
        }
        if (isEssential(name)) {
          return entry;
        }
        const ignorePath = entry.stats.isDirectory() ? `${name}/` : name;
        return gitignore.ignores(ignorePath) ? false : entry;
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
