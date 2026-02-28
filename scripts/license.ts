import * as fs from "fs";
import * as path from "path";
import checker from "license-checker";

const excludeNames = ["toonflow-serve"];
// const strictWhiteList = ["MIT", "BSD-2-Clause", "BSD-3-Clause", "BSD", "0BSD"];
const strictWhiteList: string[] = [];

// 检查是否在白名单协议
function isStrictWhiteLicense(license: string): boolean {
  const normalized = license.replace(/[\(\)]/g, "").trim();
  const parts = normalized.split(/\s*(OR|AND|\/)\s*/i).map((part) => part.trim());
  return parts.every((part) => strictWhiteList.some((wl) => part === wl || part.replace(/ with .*/i, "") === wl));
}

// 读取 package.json 里的直接依赖
function getDirectDependencyNames(): string[] {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
  const deps = Object.keys(pkg.dependencies ?? {});
  const devDeps = Object.keys(pkg.devDependencies ?? {});
  return [...deps, ...devDeps];
}

// 执行主逻辑
checker.init({ start: process.cwd() }, (err: Error, packages: Record<string, any>) => {
  if (err) {
    console.error("license-checker 出错: ", err);
    process.exit(1);
  }
  const directNames = getDirectDependencyNames();

  interface PackageInfo {
    name: string;
    version: string;
    licenses: string | string[];
    repository: string | undefined;
  }

  const needDeclare: PackageInfo[] = [];
  for (const fullName in packages) {
    // fullName 一般形如 [@scope/]pkg@version, 但 license-checker 会带路径，如 @scope/name@1.0.0@./node_modules/@scope/name
    // 所以可以正则只保留 name@version 部分
    // nameMatch[1] 为包名，nameMatch[2] 为版本
    const nameMatch = fullName.match(/^((?:@[^\/]+\/)?[^@]+)@([^@]+)$/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    // 仅关注直接依赖
    if (!directNames.includes(name!)) continue;

    const info = packages[fullName];
    const licenseArr: string[] = Array.isArray(info.licenses) ? info.licenses : [info.licenses];
    if (!licenseArr.every(isStrictWhiteLicense)) {
      needDeclare.push({
        name: name!,
        version: info.version,
        licenses: licenseArr,
        repository: info.repository,
      });
    }
  }

  // 排除名单过滤
  const filteredDeclare = needDeclare.filter((pkg) => pkg.name && !excludeNames.some((exName) => pkg.name.startsWith(exName)));
  const content = filteredDeclare
    .map(
      (pkg) =>
        `Name: ${pkg.name}\nLicense: ${Array.isArray(pkg.licenses) ? pkg.licenses.join(", ") : pkg.licenses}\nRepository: ${pkg.repository ?? "N/A"}`,
    )
    .join("\n\n-----------------------------\n\n");
  fs.writeFileSync(path.resolve(process.cwd(), "NOTICES.txt"), content, "utf-8");
  console.log("已生成依赖声明 NOTICES.txt");
});
