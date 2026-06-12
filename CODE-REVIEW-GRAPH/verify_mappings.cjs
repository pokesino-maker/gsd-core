const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const AGENTS_JSON = path.join(__dirname, 'mappings', 'agents_mapping.json');
const WORKFLOWS_JSON = path.join(__dirname, 'mappings', 'workflows_mapping.json');
const LOG_FILE = path.join(__dirname, 'validation.log');

let logContent = '';
function log(msg) {
  console.log(msg);
  logContent += msg + '\n';
}

function normalize(str) {
  if (!str) return '';
  // Remove BOM if present, replace Windows CRLF with LF
  return str.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
}

function run() {
  log(`--- Mappings Validation Run: ${new Date().toISOString()} ---`);
  
  const filesToVerify = [
    { name: 'agents_mapping.json', path: AGENTS_JSON },
    { name: 'workflows_mapping.json', path: WORKFLOWS_JSON }
  ];

  let totalChecked = 0;
  let totalFailed = 0;
  let totalPassed = 0;

  for (const item of filesToVerify) {
    log(`\nAnalyzing ${item.name}...`);
    if (!fs.existsSync(item.path)) {
      log(`ERROR: Mapping file ${item.name} not found at ${item.path}`);
      totalFailed++;
      continue;
    }

    let mappings;
    try {
      mappings = JSON.parse(fs.readFileSync(item.path, 'utf8'));
    } catch (e) {
      log(`ERROR: Failed to parse ${item.name}: ${e.message}`);
      totalFailed++;
      continue;
    }

    if (!Array.isArray(mappings)) {
      log(`ERROR: Content of ${item.name} is not an array`);
      totalFailed++;
      continue;
    }

    for (let i = 0; i < mappings.length; i++) {
      const entry = mappings[i];
      const entryNum = i + 1;
      const filePath = entry.file_path;
      const originalText = entry.original_text;
      const lineRange = entry.line_range;

      totalChecked++;

      if (!filePath) {
        log(`[FAIL] Entry #${entryNum} in ${item.name}: Missing "file_path"`);
        totalFailed++;
        continue;
      }

      if (typeof originalText !== 'string') {
        log(`[FAIL] Entry #${entryNum} in ${item.name} (${filePath}): "original_text" is not a string`);
        totalFailed++;
        continue;
      }

      const fullPath = path.join(ROOT_DIR, filePath);
      if (!fs.existsSync(fullPath)) {
        log(`[FAIL] Entry #${entryNum} in ${item.name}: Target file "${filePath}" does not exist at absolute path "${fullPath}"`);
        totalFailed++;
        continue;
      }

      let fileContent;
      try {
        fileContent = fs.readFileSync(fullPath, 'utf8');
      } catch (err) {
        log(`[FAIL] Entry #${entryNum} in ${item.name}: Failed to read "${filePath}" - ${err.message}`);
        totalFailed++;
        continue;
      }

      const normFile = normalize(fileContent);
      const normOrig = normalize(originalText);

      if (normFile.includes(normOrig)) {
        totalPassed++;
      } else {
        totalFailed++;
        log(`[FAIL] Entry #${entryNum} in ${item.name} (${filePath}, lines ${lineRange || 'unknown'}):`);
        log(`  Could not find the original text in the target file.`);
        log(`  Expected text snippet:\n----------\n${originalText}\n----------`);
      }
    }
  }

  log(`\n--- Summary ---`);
  log(`Total entries checked: ${totalChecked}`);
  log(`Passed: ${totalPassed}`);
  log(`Failed: ${totalFailed}`);

  try {
    fs.writeFileSync(LOG_FILE, logContent, 'utf8');
    console.log(`\nLog written to: ${LOG_FILE}`);
  } catch (err) {
    console.error(`Failed to write log file: ${err.message}`);
  }

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
