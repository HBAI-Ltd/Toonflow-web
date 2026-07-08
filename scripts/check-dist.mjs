import fs from "node:fs";
import path from "node:path";

const indexPath = path.join(process.cwd(), "dist", "index.html");
const maxIndexBytes = Number(process.env.TOONFLOW_MAX_INDEX_BYTES || 2_000_000);

function fail(message) {
  console.error(`check-dist failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  fail("dist/index.html does not exist");
}

const indexBytes = fs.statSync(indexPath).size;
if (indexBytes > maxIndexBytes) {
  fail(`dist/index.html is ${indexBytes} bytes, max allowed is ${maxIndexBytes}`);
}

console.log(`check-dist passed: index.html ${indexBytes} bytes`);
