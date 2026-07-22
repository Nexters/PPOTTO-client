import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { generateComponent, generateIcons, toComponentName } from './generate.mjs';

test('generates a PascalCase component with an overridable default color', async () => {
  assert.equal(toComponentName('finger-test.svg'), 'FingerTest');

  const code = await generateComponent(
    '<svg viewBox="0 0 10 10"><path fill="white" d="M0 0h10v10z"/></svg>',
    'FingerTest',
    'finger-test.svg',
  );

  assert.match(code, /color="var\(--icon-default-color, white\)"/);
  assert.match(code, /fill="currentColor"/);
  assert.match(code, /\.\.\.props/);
});

test('preserves the original colors of a multicolor icon', async () => {
  const code = await generateComponent(
    '<svg><path fill="red" d="M0 0h1v1z"/><path stroke="blue" d="M0 0h1"/></svg>',
    'MulticolorIcon',
    'multicolor-icon.svg',
  );

  assert.match(code, /fill="red"/);
  assert.match(code, /stroke="blue"/);
  assert.doesNotMatch(code, /currentColor|--icon-default-color/);
});

test('regenerates modified icons and removes deleted output', async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), 'svg-generator-'));
  const inputDir = path.join(root, 'svg');
  const outputDir = path.join(root, 'generated');
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(inputDir);

  const source = path.join(inputDir, 'sample-icon.svg');
  await writeFile(source, '<svg><path fill="white" d="M0 0h1v1z"/></svg>');
  await generateIcons({ inputDir, outputDir });
  await writeFile(path.join(outputDir, 'DeletedIcon.tsx'), 'stale');
  await writeFile(source, '<svg><path fill="black" d="M0 0h1v1z"/></svg>');
  await generateIcons({ inputDir, outputDir });

  const component = await readFile(path.join(outputDir, 'SampleIcon.tsx'), 'utf8');
  assert.match(component, /--icon-default-color, black/);
  await assert.rejects(access(path.join(outputDir, 'DeletedIcon.tsx')));
});

test('rejects an output directory containing the input directory', async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), 'svg-generator-'));
  const inputDir = path.join(root, 'svg');
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(inputDir);

  await assert.rejects(
    generateIcons({ inputDir, outputDir: root }),
    /Output directory must not contain the input directory/,
  );
  await access(inputDir);
});
