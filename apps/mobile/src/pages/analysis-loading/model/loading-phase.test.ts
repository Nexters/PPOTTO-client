import { loadingPhaseFor, nextLoadingPhase } from './loading-phase';

it.each([
  [0, 'SCAN'],
  [25, 'SCAN'],
  [26, 'GROUP'],
  [50, 'GROUP'],
  [51, 'ASSEMBLE'],
  [75, 'ASSEMBLE'],
  [76, 'DECK'],
  [99, 'DECK'],
  [100, 'REVEAL'],
] as const)('진행률 %i는 %s 막을 보여준다', (progress, phase) => {
  expect(loadingPhaseFor(progress)).toBe(phase);
});

it('막 전환은 요청 단계로 점프하지 않고 다음 막을 반환한다', () => {
  expect(nextLoadingPhase('SCAN')).toBe('GROUP');
  expect(nextLoadingPhase('GROUP')).toBe('ASSEMBLE');
  expect(nextLoadingPhase('DECK')).toBe('REVEAL');
  expect(nextLoadingPhase('REVEAL')).toBeUndefined();
});
