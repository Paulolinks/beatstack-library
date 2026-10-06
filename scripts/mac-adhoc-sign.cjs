// afterSign (Library Mac): sem certificado Apple, assina ad-hoc ("-").
// Mac com chip Apple não executa app sem nenhuma assinatura.
const { execFileSync } = require("child_process");
const path = require("path");

exports.default = async function macAdhocSign(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  console.log(`  • ad-hoc signing  app=${appPath}`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], { stdio: "inherit" });
};
