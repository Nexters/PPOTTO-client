const getOnboardingSeenKey = (userId: string) => `ppotto:onboarding-seen:${userId}`;

export const hasSeenOnboarding = (userId: string) =>
  localStorage.getItem(getOnboardingSeenKey(userId)) === '1';

export const markOnboardingAsSeen = (userId: string) =>
  localStorage.setItem(getOnboardingSeenKey(userId), '1');
