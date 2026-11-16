import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../index.js", import.meta.url));

async function packageTheme(t, files, args = ["--all"]) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "theme-package-test-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const fixture = {
    "theme.yaml": "metadata:\n  name: test-theme\nspec:\n  version: 1.0.0\n",
    "templates/index.html": "<html>Theme</html>",
    ...files,
  };
  for (const [name, content] of Object.entries(fixture)) {
    const target = path.join(cwd, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  execFileSync(process.execPath, [cli, ...args], { cwd, timeout: 15_000 });
  const zip = path.join(cwd, "dist/test-theme-1.0.0.zip");
  execFileSync("unzip", ["-t", zip]);
  const allEntries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).trim().split("\n");
  assert.ok(
    allEntries.every((name) => !name.split("/").includes(".git")),
    "Exclude Git metadata files and directories at every level",
  );
  const entries = allEntries.filter((name) => !name.endsWith("/"));
  assert.equal(new Set(entries).size, entries.length, "No duplicate file entries");
  assert.ok(!entries.includes("dist/test-theme-1.0.0.zip"), "Exclude the output ZIP");
  return entries.sort();
}

test("--all respects root .gitignore patterns, negation, and directory rules", async (t) => {
  const entries = await packageTheme(t, {
    ".gitignore": "# Theme files\n*.log\n!keep.log\n/cache/\nscratch/\n.env\ndist/\n",
    "debug.log": "excluded",
    "nested/debug.log": "excluded",
    "keep.log": "included",
    "nested/keep.log": "included",
    "cache/file.txt": "excluded",
    "nested/cache/file.txt": "included",
    "nested/scratch/file.txt": "excluded",
    ".env": "excluded",
    scratch: "included because the rule only matches directories",
    ".visible": "included",
    "dist/old.zip": "excluded",
  });
  assert.deepEqual(entries, [
    ".gitignore",
    ".visible",
    "keep.log",
    "nested/cache/file.txt",
    "nested/keep.log",
    "scratch",
    "templates/index.html",
    "theme.yaml",
  ]);
});

test("--all always includes ui-plugin/dist even when its parent is ignored", async (t) => {
  const entries = await packageTheme(t, {
    ".gitignore": "ui-plugin/\n*.js\ndist/\n",
    "ui-plugin/dist/main.js": "export default 1;",
    "ui-plugin/dist/.manifest.json": "{}",
    "ui-plugin/dist/assets/main.css": "body {}",
    "ui-plugin/src/main.js": "excluded",
    "ui-plugin/dist-other/main.js": "excluded",
  });
  assert.deepEqual(entries, [
    ".gitignore",
    "templates/index.html",
    "theme.yaml",
    "ui-plugin/dist/.manifest.json",
    "ui-plugin/dist/assets/main.css",
    "ui-plugin/dist/main.js",
  ]);
});

test("--all gives every essential path priority over .gitignore", async (t) => {
  const essentialFiles = {
    "templates/.hidden.html": "included",
    "templates/nested/page.html": "included",
    "templates/node_modules/example/index.js": "included",
    "templates/.DS_Store": "included",
    "ui-plugin/dist/main.js": "included",
    "README.md": "included",
    LICENSE: "included",
    "i18n/nested/en.yaml": "included",
    "settings.yaml": "included",
    "settings.yml": "included",
    ".hidden.yaml": "included",
    "screenshot.png": "included",
    "screenshot.jpeg": "included",
    "screenshot.jpg": "included",
    "screenshot.webp": "included",
  };
  const entries = await packageTheme(t, {
    ".gitignore": "*\n!extra.txt\n",
    ...essentialFiles,
    "extra.txt": "included",
    "templates-other/page.html": "excluded",
    "nested/settings.yaml": "excluded",
    "nested/README.md": "excluded",
    "nested/screenshot.png": "excluded",
    "screenshot.gif": "excluded",
    "dist/old.zip": "excluded",
  });
  assert.deepEqual(
    entries,
    [...Object.keys(essentialFiles), "extra.txt", "templates/index.html", "theme.yaml"].sort(),
  );
});

test("-a only excludes Git metadata and the output ZIP when .gitignore is absent", async (t) => {
  const files = {
    ".DS_Store": "included",
    ".github/workflows/build.yaml": "included",
    ".idea/project.xml": "included",
    "node_modules/example/index.js": "included",
    "dist/old.zip": "included",
    "nested/.gitignore": "file.txt\n",
    "nested/file.txt": "included",
  };
  const entries = await packageTheme(t, { ...files, ".git/config": "excluded" }, ["-a"]);
  assert.deepEqual(entries, [...Object.keys(files), "templates/index.html", "theme.yaml"].sort());
});

for (const args of [[], ["--all"]]) {
  for (const gitPath of [".git/config", ".git"]) {
    test(`${args.length ? "--all" : "default"} excludes ${gitPath} and nested Git metadata`, async (t) => {
      const entries = await packageTheme(
        t,
        {
          ".gitignore": "!.git\n!.git/**\n!**/.git\n!**/.git/**\n",
          [gitPath]: "excluded",
          "templates/.git/config": "excluded",
          "templates/nested/.git": "gitdir: /tmp/example",
          "ui-plugin/dist/.git/config": "excluded",
          "i18n/.git": "gitdir: /tmp/example",
          "templates/.github/keep.html": "included",
          "templates/.gitignore": "included",
        },
        args,
      );
      assert.deepEqual(entries, [
        ...(args.length ? [".gitignore"] : []),
        "templates/.github/keep.html",
        "templates/.gitignore",
        "templates/index.html",
        "theme.yaml",
      ]);
    });
  }
}

test("default mode preserves essential files and built-in exclusions", async (t) => {
  const entries = await packageTheme(
    t,
    {
      ".gitignore": "*\n",
      "ui-plugin/dist/main.js": "export default 1;",
      "templates/node_modules/example/index.js": "excluded",
      "templates/.DS_Store": "excluded",
      "README.md": "Theme",
      LICENSE: "MIT",
      "i18n/en.yaml": "title: Theme",
      "settings.yml": "[]",
      "screenshot.webp": "image",
      "src/main.js": "excluded",
      "dist/old.zip": "excluded",
    },
    [],
  );
  assert.deepEqual(entries, [
    "LICENSE",
    "README.md",
    "i18n/en.yaml",
    "screenshot.webp",
    "settings.yml",
    "templates/index.html",
    "theme.yaml",
    "ui-plugin/dist/main.js",
  ]);
});
