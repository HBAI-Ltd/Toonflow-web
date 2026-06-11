import assert from "node:assert/strict";
import {
  MANUAL_OMNI_REFERENCE_MODE,
  MANUAL_SMART_MULTI_FRAME_MODE,
  appendManualVideoModeOptions,
  buildSmartFrameTransitionText,
  getPromptGenerationMode,
  isManualOmniReferenceMode,
  isManualSmartMultiFrameMode,
  isManualVideoMode,
} from "./manualVideoModes";

const baseOptions = [
  { value: "text", label: "文本生视频" },
  { value: "singleImage", label: "单图" },
];

assert.equal(isManualVideoMode(MANUAL_OMNI_REFERENCE_MODE), true);
assert.equal(isManualVideoMode(MANUAL_SMART_MULTI_FRAME_MODE), true);
assert.equal(isManualVideoMode("text"), false);
assert.equal(isManualOmniReferenceMode(MANUAL_OMNI_REFERENCE_MODE), true);
assert.equal(isManualSmartMultiFrameMode(MANUAL_SMART_MULTI_FRAME_MODE), true);

assert.deepEqual(getPromptGenerationMode(MANUAL_OMNI_REFERENCE_MODE), ["imageReference:9", "videoReference:3", "audioReference:3"]);
assert.deepEqual(getPromptGenerationMode(MANUAL_SMART_MULTI_FRAME_MODE), ["imageReference:9"]);
assert.equal(getPromptGenerationMode("singleImage"), "singleImage");

assert.deepEqual(
  appendManualVideoModeOptions(baseOptions, "jimeng-seedance-pro").map((item) => item.value),
  ["text", "singleImage", MANUAL_OMNI_REFERENCE_MODE, MANUAL_SMART_MULTI_FRAME_MODE],
);
assert.deepEqual(
  appendManualVideoModeOptions(baseOptions, "other-model").map((item) => item.value),
  ["text", "singleImage"],
);
assert.deepEqual(
  appendManualVideoModeOptions([{ value: MANUAL_OMNI_REFERENCE_MODE, label: "已存在" }], "jimeng").map((item) => item.value),
  [MANUAL_OMNI_REFERENCE_MODE, MANUAL_SMART_MULTI_FRAME_MODE],
);

assert.equal(buildSmartFrameTransitionText(0), "第 1 帧到第 2 帧：保持主体一致，镜头自然过渡，动作连续，画面风格和光影统一。");

console.log("manualVideoModes tests passed");
