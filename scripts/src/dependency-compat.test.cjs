// Exercise the legacy glob/minimatch consumers used by ExcelJS. They cannot
// upgrade their parent dependencies yet, so the security override crosses majors.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { mkdtemp, mkdir, writeFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");

const appRequire = createRequire(
  path.resolve(__dirname, "../../artifacts/cpr-scheduler/package.json"),
);
const excelRequire = createRequire(appRequire.resolve("exceljs"));
const archiver = excelRequire("archiver");
const archiveRequire = createRequire(excelRequire.resolve("archiver"));
const utilsRequire = createRequire(archiveRequire.resolve("archiver-utils"));
const glob = utilsRequire("glob");

test("legacy glob supports brace patterns, globstars and ignored files with patched minimatch", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "dependency-glob-"));
  try {
    await mkdir(path.join(cwd, "nested"));
    await writeFile(path.join(cwd, "a.csv"), "name\nStudent");
    await writeFile(path.join(cwd, "nested/b.txt"), "notes");
    await writeFile(path.join(cwd, "nested/skip.csv"), "ignored");
    const options = { cwd, nodir: true, ignore: "**/skip.*" };
    const expected = ["a.csv", "nested/b.txt"];
    assert.deepEqual(glob.sync("**/*.{csv,txt}", options).sort(), expected);
    const files = await new Promise((resolve, reject) => {
      glob("**/*.{csv,txt}", options, (error, matches) =>
        error ? reject(error) : resolve(matches),
      );
    });
    assert.deepEqual(files.sort(), expected);
    assert.deepEqual(glob.sync("**/*.missing", { ...options, nonull: true }), [
      "**/*.missing",
    ]);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("ExcelJS archive dependencies glob and round-trip actual ZIP contents", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "dependency-archive-"));
  try {
    await mkdir(path.join(cwd, "nested"));
    await writeFile(path.join(cwd, "roster.csv"), "name\nStudent");
    await writeFile(path.join(cwd, "nested/notes.txt"), "notes");
    await writeFile(path.join(cwd, "nested/skip.csv"), "ignored");
    const archive = archiver("zip");
    const chunks = [];
    const complete = new Promise((resolve, reject) => {
      archive.on("data", (chunk) => chunks.push(chunk));
      archive.on("error", reject);
      archive.on("warning", reject);
      archive.on("end", resolve);
    });
    archive.glob("**/*.{csv,txt}", { cwd, ignore: "**/skip.*" });
    await Promise.all([archive.finalize(), complete]);
    const zip = await excelRequire("unzipper").Open.buffer(Buffer.concat(chunks));
    assert.deepEqual(
      zip.files.map((file) => file.path).sort(),
      ["nested/notes.txt", "roster.csv"],
    );
    const roster = zip.files.find((file) => file.path === "roster.csv");
    assert.equal((await roster.buffer()).toString(), "name\nStudent");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
