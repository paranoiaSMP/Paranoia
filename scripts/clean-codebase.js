const fs = require('fs');
const path = require('path');

function stripJsComments(content) {
  let result = '';
  let i = 0;
  const n = content.length;
  let state = 'default';

  while (i < n) {
    const ch = content[i];
    const next = content[i + 1];

    switch (state) {
      case 'default':
        if (ch === '"') {
          state = 'double';
          result += ch;
          i++;
        } else if (ch === "'") {
          state = 'single';
          result += ch;
          i++;
        } else if (ch === '`') {
          state = 'template';
          result += ch;
          i++;
        } else if (ch === '/' && next === '/') {
          state = 'line_comment';
          i += 2;
        } else if (ch === '/' && next === '*') {
          state = 'block_comment';
          i += 2;
        } else {
          result += ch;
          i++;
        }
        break;

      case 'double':
        result += ch;
        if (ch === '\\') {
          result += next || '';
          i += 2;
        } else {
          if (ch === '"') state = 'default';
          i++;
        }
        break;

      case 'single':
        result += ch;
        if (ch === '\\') {
          result += next || '';
          i += 2;
        } else {
          if (ch === "'") state = 'default';
          i++;
        }
        break;

      case 'template':
        result += ch;
        if (ch === '\\') {
          result += next || '';
          i += 2;
        } else {
          if (ch === '`') state = 'default';
          i++;
        }
        break;

      case 'line_comment':
        if (ch === '\n') {
          state = 'default';
          result += '\n';
        }
        i++;
        break;

      case 'block_comment':
        if (ch === '*' && next === '/') {
          state = 'default';
          i += 2;
        } else {
          if (ch === '\n') result += '\n';
          i++;
        }
        break;
    }
  }

  return cleanEmptyLines(result);
}

function stripPyComments(content) {
  const lines = content.split(/\r?\n/);
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.startsWith('#!')) {
      result.push(line);
      continue;
    }

    let clean = '';
    let state = 'default';
    let j = 0;
    while (j < line.length) {
      const ch = line[j];
      const next = line[j + 1];
      if (state === 'default') {
        if (ch === '"') {
          state = 'double';
          clean += ch;
          j++;
        } else if (ch === "'") {
          state = 'single';
          clean += ch;
          j++;
        } else if (ch === '#') {
          break;
        } else {
          clean += ch;
          j++;
        }
      } else if (state === 'double') {
        clean += ch;
        if (ch === '\\') {
          clean += next || '';
          j += 2;
        } else {
          if (ch === '"') state = 'default';
          j++;
        }
      } else if (state === 'single') {
        clean += ch;
        if (ch === '\\') {
          clean += next || '';
          j += 2;
        } else {
          if (ch === "'") state = 'default';
          j++;
        }
      }
    }

    if (clean.trim().length > 0 || line.trim().length === 0) {
      result.push(clean.replace(/\s+$/, ''));
    }
  }

  return cleanEmptyLines(result.join('\n'));
}

function cleanEmptyLines(text) {
  return text
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (trimmed === '') {
        if (acc.length > 0 && acc[acc.length - 1] === '') return acc;
        acc.push('');
      } else {
        acc.push(line);
      }
      return acc;
    }, [])
    .join('\n');
}

function processDirectory(dir, exts, stripper) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git' && entry.name !== '.venv') {
        processDirectory(fullPath, exts, stripper);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (exts.includes(ext)) {
        const original = fs.readFileSync(fullPath, 'utf8');
        const cleaned = stripper(original);
        if (cleaned !== original) {
          fs.writeFileSync(fullPath, cleaned, 'utf8');
          console.log(`Cleaned: ${fullPath}`);
        }
      }
    }
  }
}

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const botDir = path.join(rootDir, 'Bot');

console.log('Processing src...');
processDirectory(srcDir, ['.ts', '.tsx', '.js', '.jsx'], stripJsComments);

console.log('Processing Bot...');
processDirectory(botDir, ['.py'], stripPyComments);

console.log('Done!');
