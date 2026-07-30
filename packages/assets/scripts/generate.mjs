/**
 * SVG 파일을 Web·React Native 공용 react-native-svg 컴포넌트로 변환
 * 단색 SVG는 외부에서 색상을 변경할 수 있고, 다색 SVG는 원본 색상을 유지
 *
 * 실행 흐름:
 * 1. 입출력 경로를 검증하고 SVG 파일을 수집
 * 2. 파일명을 PascalCase로 바꾸고 각 SVG를 React 컴포넌트로 변환
 * 3. 모든 변환이 성공하면 generated 디렉터리를 새 결과로 교체
 * 4. 생성된 컴포넌트를 내보내는 배럴파일 작성
 */
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

export function findDefaultColor(svg) {
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
  return colors.size === 1 ? colors.values().next().value : null;
}

export async function generateComponent(svg, componentName, filePath = componentName) {
  const defaultColor = findDefaultColor(svg);
  const code = await transform(
    svg,
    {
      plugins: [svgo, jsx],
      native: true,
      typescript: true,
      jsxRuntime: 'automatic',
      expandProps: 'end',
      ...(defaultColor && {
        replaceAttrValues: { [defaultColor]: 'currentColor' },
        svgProps: { color: `{props.color ?? "${defaultColor}"}` },
      }),
      svgoConfig: {
        plugins: [
          {
            name: 'preset-default',
            params: { overrides: { removeViewBox: false, convertColors: false } },
          },
          { name: 'removeXMLNS' },
          { name: 'removeAttrs', params: { attrs: 'svg:overflow' } },
          { name: 'prefixIds', params: { prefix: `icon-${componentName}` } },
        ],
      },
    },
    { componentName, filePath },
  );

  return format(code, { parser: 'typescript', singleQuote: true });
}

export async function generateIcons(options = {}) {
  const sourceDir = path.resolve(options.inputDir ?? inputDir);
  const targetDir = path.resolve(options.outputDir ?? outputDir);
  const relativeSourceDir = path.relative(targetDir, sourceDir);

  if (
    relativeSourceDir === '' ||
    (relativeSourceDir !== '..' &&
      !relativeSourceDir.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativeSourceDir))
  ) {
    throw new Error('Output directory must not contain the input directory');
  }

  if (!(await exists(sourceDir))) {
    throw new Error(`SVG directory does not exist: ${sourceDir}`);
  }

  const svgFiles = (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
    .map((entry) => entry.name)
    .sort();
  const names = new Set();
  const components = [];

  for (const fileName of svgFiles) {
    const componentName = toComponentName(fileName);
    if (names.has(componentName)) {
      throw new Error(`Duplicate component name: ${componentName}`);
    }
    names.add(componentName);

    const svgPath = path.join(sourceDir, fileName);
    const svg = await readFile(svgPath, 'utf8');
    components.push({
      name: componentName,
      code: await generateComponent(svg, componentName, fileName),
    });
  }

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  for (const component of components) {
    await writeFile(path.join(targetDir, `${component.name}.tsx`), component.code);
  }

  const index = [...names]
    .sort()
    .map((name) => `export { default as ${name} } from './${name}';`)
    .join('\n');
  await writeFile(path.join(targetDir, 'index.ts'), `${index}\n`);

  return { generated: components.length };
}

if (path.resolve(process.argv[1] ?? '') === scriptPath) {
  generateIcons()
    .then(({ generated }) => {
      process.stdout.write(`SVG generation complete: generated=${generated}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
