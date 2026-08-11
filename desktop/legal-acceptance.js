const fs = require("fs");
const path = require("path");

const FILE_NAME = "legal-acceptance.json";

function filePath(userDataDir) {
  return path.join(userDataDir, FILE_NAME);
}

function readRecord(userDataDir) {
  const file = filePath(userDataDir);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function writeRecord(userDataDir, record) {
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(filePath(userDataDir), JSON.stringify(record, null, 2), "utf8");
}

function needsReaccept(record, termsVersion, privacyVersion) {
  if (!record) return true;
  return record.termsVersion !== termsVersion || record.privacyVersion !== privacyVersion;
}

function getStatus(userDataDir, termsVersion, privacyVersion) {
  const record = readRecord(userDataDir);
  const stale = needsReaccept(record, termsVersion, privacyVersion);
  return {
    accepted: Boolean(record) && !stale,
    needsReaccept: stale,
    record,
  };
}

function accept(userDataDir, record) {
  writeRecord(userDataDir, record);
  return { ok: true, record };
}

module.exports = { getStatus, accept, readRecord };
