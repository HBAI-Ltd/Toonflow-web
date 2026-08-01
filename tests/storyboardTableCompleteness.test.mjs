import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
