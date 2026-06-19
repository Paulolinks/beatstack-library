const { copyFileToClipboardWin } = require("../desktop/clipboard-win");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Uso: node scripts/test-clipboard.js <caminho-do-arquivo>");
  process.exit(1);
}

console.log(copyFileToClipboardWin(filePath));
