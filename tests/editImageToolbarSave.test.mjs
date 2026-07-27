import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentPath = fileURLToPath(
  new URL("../src/views/production/components/editImage/index.vue", import.meta.url),
);
const source = readFileSync(componentPath, "utf8");

test("图片编辑器左侧工具栏提供清晰可见的保存按钮", () => {
  assert.match(source, /class="guide-save-btn"/);
  assert.match(source, /@click="saveSelectedNode"/);
  assert.match(source, /<i-save\s*\/>/);
  assert.match(source, /\$t\("common\.save"\)/);
});

test("工具栏保存只接受一个包含图片的选中节点", () => {
  assert.match(source, /getSelectedNodes/);
  assert.match(source, /selectedNodes\.length !== 1/);
  assert.match(source, /data\.image/);
  assert.match(source, /data\.generatedImage/);
  assert.match(source, /selectNodeToSave/);
});

test("工具栏保存复用现有最终结果保存链路", () => {
  assert.match(source, /await sureNode\(imageUrl\)/);
  assert.match(source, /\/production\/editImage\/saveImageFlow/);
  assert.match(source, /\/production\/editImage\/updateImageFlow/);
});
