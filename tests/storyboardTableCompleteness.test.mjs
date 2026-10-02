import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { appendThinkingDelta } from "../src/utils/useChat.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("XML events expose real closing-tag completeness", () => {
  const source = read("src/utils/useChat.ts");

  assert.match(source, /isComplete:\s*boolean/);
  assert.match(source, /status === "complete"\s*\?\s*"error"/);
  assert.match(source, /isComplete,\s*\n\s*status:\s*eventStatus/);
});

test("storyboard table state only commits a genuinely closed XML response", () => {
  const source = read("src/stores/productionAgent.ts");
  const handlerStart = source.indexOf("onXmlTag: async");
  const handlerEnd = source.indexOf("});", handlerStart);
  const handler = source.slice(handlerStart, handlerEnd);

  assert.match(handler, /const \{[^}]*isComplete[^}]*\} = data/);
  assert.match(handler, /tag === "storyboardTable"[\s\S]*isComplete && status === "complete"/);
  assert.match(handler, /flowData\.value\.storyboardTable = value \?\? ""/);
});

test("execution director thinking is expanded without changing other agents", () => {
  const chatSource = read("src/utils/useChat.ts");
  const storeSource = read("src/stores/productionAgent.ts");

  assert.match(chatSource, /defaultThinkingCollapsed\?:\s*boolean\s*\|\s*\(\(message:\s*ChatMessagesData\)\s*=>\s*boolean\)/);
  assert.match(chatSource, /collapsed:\s*resolveDefaultThinkingCollapsed\(msg\)/);
  assert.doesNotMatch(chatSource, /name\s*===\s*["']执行导演["']/);

  assert.match(storeSource, /function\s+isExecutionDirectorMessage[\s\S]*name\s*===\s*"执行导演"/);
  assert.match(storeSource, /defaultThinkingCollapsed:\s*\(message\)\s*=>\s*!isExecutionDirectorMessage\(message\)/);
  assert.match(storeSource, /data\.map\(expandExecutionDirectorThinking\)/);
  assert.match(storeSource, /collapsed:\s*false/);
});

test("thinking reasoning deltas append to the complete accumulated text", () => {
  const source = read("src/utils/useChat.ts");
  const deltas = ["正", "在", "读取剧本"];
  const snapshots = [];
  let thinking = { title: "思考中...", text: "" };

  for (const text of deltas) {
    thinking = appendThinkingDelta(thinking, { text });
    snapshots.push(thinking.text);
  }

  assert.match(source, /content\.type\s*===\s*["']thinking["'][\s\S]*strategy\s*===\s*["']append["']/);
  assert.match(source, /content\.data\s*=\s*appendThinkingDelta\(content\.data,\s*data\)/);
  assert.deepEqual(snapshots, ["正", "正在", "正在读取剧本"]);
  assert.deepEqual(thinking, { title: "思考中...", text: "正在读取剧本" });
});
