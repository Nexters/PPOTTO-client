const getCoachMarkSeenKey = (coachMarkId: string, userId: string) =>
  `ppotto:coachmark-seen:${coachMarkId}:${userId}`;

export const hasSeenCoachMark = (coachMarkId: string, userId: string) =>
  localStorage.getItem(getCoachMarkSeenKey(coachMarkId, userId)) === '1';

export const markCoachMarkSeen = (coachMarkId: string, userId: string) =>
  localStorage.setItem(getCoachMarkSeenKey(coachMarkId, userId), '1');
