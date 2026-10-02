import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const liveMediaFiles = [
  "src/views/assets/components/generateImage.vue",
  "src/views/assets/components/batchGeneration.vue",
  "src/views/assets/index.vue",
  "src/views/cornerScape/index.vue",
  "src/stores/productionAgent.ts",
  "src/views/production/node/storyboard.vue",
  "src/views/production/components/editImage/generatedNode.vue",
  "src/views/production/components/workbench/generate/index.vue",
  "src/views/production/components/workbench/generate/components/track.vue",
  "src/components/setting/components/vendorTest/ImageModelTest.vue",
  "src/components/setting/components/vendorTest/VideoModelTest.vue",
];

const forbiddenEndpoints = [
  "/assetsGenerate/generateAssets",
  "/assetsGenerate/batchGenerateImageAssets",
  "/production/assets/batchGenerateAssetsImage",
  "/production/storyboard/batchGenerateImage",
  "/production/editImage/generateFlowImage",
  "/production/workbench/generateVideo",
  "/production/workbench/batchGenerateVideo",
];

test("manual media helper builds complete prompts and supports clipboard copy", () => {
  const source = read("src/utils/manualMedia.ts");

  assert.match(source, /buildManualImagePrompt/);
  assert.match(source, /buildManualVideoPrompt/);
  assert.match(source, /buildBatchPrompt/);
  assert.match(source, /navigator\.clipboard\.writeText/);
});

test("live image and video workflows do not call media generation endpoints", () => {
  for (const relativePath of liveMediaFiles) {
    const source = read(relativePath);
    for (const endpoint of forbiddenEndpoints) {
      const hasExactEndpoint = [`"${endpoint}"`, `'${endpoint}'`, `\`${endpoint}\``].some((literal) => source.includes(literal));
      assert.ok(!hasExactEndpoint, `${relativePath} still calls ${endpoint}`);
    }
  }
});

test("image and video result positions expose manual upload actions", () => {
  const imageDialog = read("src/views/assets/components/generateImage.vue");
  const generatedNode = read("src/views/production/components/editImage/generatedNode.vue");
  const videoCard = read("src/views/production/components/workbench/generate/components/video.vue");
  const imageModelTest = read("src/components/setting/components/vendorTest/ImageModelTest.vue");
  const videoModelTest = read("src/components/setting/components/vendorTest/VideoModelTest.vue");

  assert.match(imageDialog, /copyManualPrompt/);
  assert.match(imageDialog, /handleCustomUpload/);
  assert.match(generatedNode, /copyManualPrompt/);
  assert.match(generatedNode, /lensImage/);
  assert.match(videoCard, /uploadVideo/);
  assert.match(videoCard, /\/production\/workbench\/uploadVideo/);
  assert.match(imageModelTest, /uploadResultImage/);
  assert.match(videoModelTest, /uploadResultVideo/);
});
