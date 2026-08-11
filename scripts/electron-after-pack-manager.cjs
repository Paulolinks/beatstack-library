/** Copia o exe ao lado do app principal (ICU/locale ficam na mesma pasta). */
exports.default = async function afterPack(context) {
  const fs = require("fs");
  const path = require("path");

  const appOutDir = context.appOutDir;
  const productFilename = context.packager.appInfo.productFilename;
  const src = path.join(appOutDir, `${productFilename}.exe`);
  const dest = path.join(appOutDir, "beatstack-server.exe");

  if (!fs.existsSync(src)) {
    throw new Error(`Executável não encontrado: ${src}`);
  }

  fs.copyFileSync(src, dest);
  console.log("[afterPack] beatstack-server.exe criado ao lado do app principal");
};
