const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const AGENTS_JSON = path.join(__dirname, 'mappings', 'agents_mapping.json');
const WORKFLOWS_JSON = path.join(__dirname, 'mappings', 'workflows_mapping.json');
const LOG_FILE = path.join(__dirname, 'apply_optimizations.log');

let logContent = '';
function log(msg) {
  console.log(msg);
  logContent += msg + '\n';
}

function normalize(str) {
  if (!str) return '';
  return str.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
}

function injectSuggestedTools(fileContent, suggestedTools) {
  if (!suggestedTools || suggestedTools.length === 0) return { content: fileContent, modified: false };
  
  const lines = fileContent.split('\n');
  let inFrontmatter = false;
  let toolsLineIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (i === 0 && line === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter && line === '---') {
      break;
    }
    if (inFrontmatter && line.startsWith('tools:')) {
      toolsLineIndex = i;
      break;
    }
  }
  
  if (toolsLineIndex === -1) {
    return { content: fileContent, modified: false };
  }
  
  const originalLine = lines[toolsLineIndex];
  const colonIndex = originalLine.indexOf(':');
  const toolsPart = originalLine.substring(colonIndex + 1).trim();
  const currentTools = toolsPart ? toolsPart.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  const updatedTools = [...currentTools];
  let toolsAdded = 0;
  for (const tool of suggestedTools) {
    if (!updatedTools.includes(tool)) {
      updatedTools.push(tool);
      toolsAdded++;
    }
  }
  
  if (toolsAdded === 0) {
    return { content: fileContent, modified: false };
  }
  
  const indent = originalLine.substring(0, originalLine.indexOf('tools:'));
  lines[toolsLineIndex] = `${indent}tools: ${updatedTools.join(', ')}`;
  
  return { content: lines.join('\n'), modified: true };
}

function run() {
  log(`--- Applying Mappings Optimizations: ${new Date().toISOString()} ---`);
  
  const filesToProcess = [
    { name: 'agents_mapping.json', path: AGENTS_JSON },
    { name: 'workflows_mapping.json', path: WORKFLOWS_JSON }
  ];

  // Step 1: Collect suggested mcp tools per file
  const toolsByFile = {};
  for (const item of filesToProcess) {
    if (!fs.existsSync(item.path)) continue;
    try {
      const mappings = JSON.parse(fs.readFileSync(item.path, 'utf8'));
      for (const entry of mappings) {
        const filePath = entry.file_path;
        if (filePath && entry.suggested_mcp_tools) {
          if (!toolsByFile[filePath]) {
            toolsByFile[filePath] = new Set();
          }
          for (const tool of entry.suggested_mcp_tools) {
            toolsByFile[filePath].add(tool);
          }
        }
      }
    } catch (e) {
      log(`ERROR: Failed to pre-parse mappings for tools from ${item.name}: ${e.message}`);
    }
  }

  // Step 2: Inject suggested tools into YAML frontmatter
  log('\n--- Phase 1: Injecting Suggested MCP Tools into Frontmatter ---');
  for (const filePath of Object.keys(toolsByFile)) {
    const fullPath = path.join(ROOT_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      log(`[SKIP] Tools injection: File "${filePath}" does not exist`);
      continue;
    }
    
    let fileContent;
    try {
      fileContent = fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      log(`[FAIL] Tools injection: Failed to read "${filePath}" - ${err.message}`);
      continue;
    }
    
    const isCRLF = fileContent.includes('\r\n');
    const normFile = normalize(fileContent);
    const suggestedToolsList = Array.from(toolsByFile[filePath]);
    
    const { content: updatedContent, modified } = injectSuggestedTools(normFile, suggestedToolsList);
    
    if (modified) {
      let finalContent = updatedContent;
      if (isCRLF) {
        finalContent = finalContent.replace(/\n/g, '\r\n');
      }
      try {
        fs.writeFileSync(fullPath, finalContent, 'utf8');
        log(`[SUCCESS] Tools injection: Injected [${suggestedToolsList.join(', ')}] into "${filePath}"`);
      } catch (err) {
        log(`[FAIL] Tools injection: Failed to write tools to "${filePath}" - ${err.message}`);
      }
    } else {
      log(`[NO_CHANGE] Tools injection: Already updated or no frontmatter in "${filePath}"`);
    }
  }

  // Step 3: Replace original_text with graph_text in all mappings
  log('\n--- Phase 2: Replacing text mappings ---');
  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;

  for (const item of filesToProcess) {
    log(`\nProcessing text replacements for ${item.name}...`);
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

    for (let i = 0; i < mappings.length; i++) {
      const entry = mappings[i];
      const entryNum = i + 1;
      const filePath = entry.file_path;
      const originalText = entry.original_text;
      const graphText = entry.graph_text;

      totalProcessed++;

      if (!filePath || !originalText || !graphText) {
        log(`[FAIL] Entry #${entryNum} in ${item.name}: Missing file_path, original_text, or graph_text`);
        totalFailed++;
        continue;
      }

      const fullPath = path.join(ROOT_DIR, filePath);
      if (!fs.existsSync(fullPath)) {
        log(`[FAIL] Entry #${entryNum} in ${item.name}: Target file "${filePath}" does not exist`);
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

      // Normalization of newlines
      const isCRLF = fileContent.includes('\r\n');
      const normFile = normalize(fileContent);
      const normOrig = normalize(originalText);
      const normGraph = normalize(graphText);

      if (!normFile.includes(normOrig)) {
        // Idempotency check: check if the graph text is already applied
        if (normFile.includes(normGraph)) {
          log(`[SUCCESS] Entry #${entryNum} in ${item.name} (${filePath}): Already optimized (graph_text matches)`);
          totalSuccessful++;
          continue;
        }
        
        log(`[FAIL] Entry #${entryNum} in ${item.name} (${filePath}): Original text not found in target file.`);
        totalFailed++;
        continue;
      }

      // Count occurrences to make sure it's unique
      const occurrences = normFile.split(normOrig).length - 1;
      if (occurrences > 1) {
        log(`[FAIL] Entry #${entryNum} in ${item.name} (${filePath}): Ambiguous match. Found ${occurrences} occurrences of original_text.`);
        totalFailed++;
        continue;
      }

      // Replace and maintain original newline format
      let updatedContent = normFile.replace(normOrig, normGraph);
      if (isCRLF) {
        updatedContent = updatedContent.replace(/\n/g, '\r\n');
      }

      try {
        fs.writeFileSync(fullPath, updatedContent, 'utf8');
        log(`[SUCCESS] Entry #${entryNum} in ${item.name} (${filePath}): Successfully replaced original_text with graph_text`);
        totalSuccessful++;
      } catch (err) {
        log(`[FAIL] Entry #${entryNum} in ${item.name} (${filePath}): Failed to write file - ${err.message}`);
        totalFailed++;
      }
    }
  }

  log(`\n--- Summary ---`);
  log(`Total mappings processed: ${totalProcessed}`);
  log(`Successfully applied: ${totalSuccessful}`);
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
