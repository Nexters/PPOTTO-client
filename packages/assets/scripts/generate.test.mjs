import assert from 'node:assert/strict';
import test from 'node:test';

import { generateComponent, toComponentName } from './generate.mjs';

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
