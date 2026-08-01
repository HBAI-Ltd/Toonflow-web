import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("project dialog does not render or require media model settings in manual media mode", () => {
  const source = read("src/views/project/components/projectDialog.vue");

  assert.doesNotMatch(source, /<modelSelect\b/);
  assert.doesNotMatch(source, /workbench\.project\.dialog\.modelData/);
  assert.doesNotMatch(source, /workbench\.project\.dialog\.videoModelData/);
  assert.doesNotMatch(source, /enterImageModel|enterVideoModel|enterProjectQuality|selectMode/);
  assert.doesNotMatch(source, /\/modelSelect\/getModelDetail/);
});

test("project payload keeps legacy media fields as optional compatibility values", () => {
  const source = read("src/views/project/components/projectDialog.vue");

  assert.match(source, /imageModel:\s*formState\.value\.imageModel/);
  assert.match(source, /videoModel:\s*formState\.value\.videoModel/);
  assert.match(source, /imageQuality:\s*formState\.value\.imageQuality/);
  assert.match(source, /mode:\s*formState\.value\.mode/);
});

test("opening a project does not check media model providers", () => {
  const source = read("src/views/project/index.vue");
  const openProject = source.slice(source.indexOf("async function openProject"), source.indexOf("function openEdit"));

  assert.doesNotMatch(openProject, /imageModel|videoModel/);
  assert.doesNotMatch(openProject, /\/modelSelect\/getModelDetail/);
  assert.doesNotMatch(openProject, /modelProviderDisabled/);
  assert.match(openProject, /project\.value\s*=\s*item/);
  assert.match(openProject, /router\.push/);
});
