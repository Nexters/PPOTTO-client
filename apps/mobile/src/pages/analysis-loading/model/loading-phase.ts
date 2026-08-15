export type LoadingPhase = 'SCAN' | 'GROUP' | 'ASSEMBLE' | 'DECK' | 'REVEAL';

const LOADING_PHASES: readonly LoadingPhase[] = ['SCAN', 'GROUP', 'ASSEMBLE', 'DECK', 'REVEAL'];

export function loadingPhaseFor(progress: number): LoadingPhase {
  if (progress <= 25) return 'SCAN';
  if (progress <= 50) return 'GROUP';
  if (progress <= 75) return 'ASSEMBLE';
  if (progress < 100) return 'DECK';
  return 'REVEAL';
}

export function phaseIndex(phase: LoadingPhase) {
  return LOADING_PHASES.indexOf(phase);
}

export function nextLoadingPhase(phase: LoadingPhase) {
  return LOADING_PHASES[phaseIndex(phase) + 1];
}
