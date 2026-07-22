import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { transform } from '@svgr/core';
import jsx from '@svgr/plugin-jsx';
import svgo from '@svgr/plugin-svgo';
import { format } from 'prettier';

const scriptPath = fileURLToPath(import.meta.url);
const assetsDir = path.resolve(path.dirname(scriptPath), '..');
const inputDir = path.join(assetsDir, 'svg');
const outputDir = path.join(assetsDir, 'generated');

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function toComponentName(fileName) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(fileName)) {
    throw new Error(`SVG filename must be kebab-case: ${fileName}`);
  }

  const name = fileName
    .slice(0, -4)
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');

  return /^\d/.test(name) ? `Svg${name}` : name;
}

export function findDefaultColor(svg, fileName) {
  const paints = [...svg.matchAll(/\b(?:fill|stroke)=["']([^"']+)["']/gi)].map(([, value]) =>
    value.trim(),
  );
  const colors = new Map();

  for (const paint of paints) {
    const normalized = paint.toLowerCase();
    if (
      !['none', 'transparent', 'currentcolor'].includes(normalized) &&
      !normalized.startsWith('url(')
    ) {
      colors.set(normalized, paint);
    }
  }

  if (colors.size === 0 && paints.some((paint) => paint.toLowerCase() === 'currentcolor')) {
    return 'black';
  }
  if (colors.size !== 1) {
    throw new Error(`${fileName} must contain exactly one fill/stroke color`);
  }

  return colors.values().next().value;
}

export async function generateComponent(svg, componentName, filePath = componentName) {
  const defaultColor = findDefaultColor(svg, filePath);
  const code = await transform(
    svg,
    {
      plugins: [svgo, jsx],
      typescript: true,
      jsxRuntime: 'automatic',
      expandProps: 'end',
      replaceAttrValues: { [defaultColor]: 'currentColor' },
      svgProps: { color: `var(--icon-default-color, ${defaultColor})` },
      svgoConfig: {
        plugins: [
          {
            name: 'preset-default',
            params: { overrides: { removeViewBox: false, convertColors: false } },
          },
          { name: 'prefixIds', params: { prefix: `icon-${componentName}` } },
        ],
      },
    },
    { componentName, filePath },
  );

  return format(code, { parser: 'typescript', singleQuote: true });
}

export async function generateIcons() {
  if (!(await exists(inputDir))) {
    throw new Error(`SVG directory does not exist: ${inputDir}`);
  }

  await mkdir(outputDir, { recursive: true });
  const svgFiles = (await readdir(inputDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
    .map((entry) => entry.name)
    .sort();
  const names = new Set();
  let generated = 0;
  let skipped = 0;

  for (const fileName of svgFiles) {
    const componentName = toComponentName(fileName);
    if (names.has(componentName)) {
      throw new Error(`Duplicate component name: ${componentName}`);
    }
    names.add(componentName);

    const outputPath = path.join(outputDir, `${componentName}.tsx`);
    if (await exists(outputPath)) {
      skipped += 1;
      continue;
    }

    const svgPath = path.join(inputDir, fileName);
    const svg = await readFile(svgPath, 'utf8');
    await writeFile(outputPath, await generateComponent(svg, componentName, fileName));
    generated += 1;
  }

  const index = [...names]
    .sort()
    .map((name) => `export { default as ${name} } from './${name}';`)
    .join('\n');
  await writeFile(path.join(outputDir, 'index.ts'), `${index}\n`);

  return { generated, skipped };
}

if (path.resolve(process.argv[1] ?? '') === scriptPath) {
  generateIcons()
    .then(({ generated, skipped }) => {
      process.stdout.write(`SVG generation complete: generated=${generated}, skipped=${skipped}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
