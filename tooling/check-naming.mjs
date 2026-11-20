import { readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOTS = [
  ['components', /^[A-Z][A-Za-z0-9]*\.(tsx|ts)$/],
  ['hooks', /^use[A-Z][A-Za-z0-9]*\.(tsx|ts)$/],
  ['services', /^[a-z][A-Za-z0-9]*Service\.ts$/],
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === '__tests__') continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(target)));
    else if (entry.name !== 'index.ts' && /\.(ts|tsx)$/.test(entry.name)) files.push(target);
  }

  return files;
}

const violations = [];
for (const [directory, convention] of ROOTS) {
  for (const file of await collectFiles(directory)) {
    if (!convention.test(path.basename(file))) violations.push(file);
  }
}

if (violations.length > 0) {
  console.error('Files that do not follow the repository naming conventions:');
  violations.forEach((file) => console.error(`- ${file}`));
  process.exitCode = 1;
}
