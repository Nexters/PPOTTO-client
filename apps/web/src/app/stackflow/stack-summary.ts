/** 화면에 살아있는(사라지는 중이 아닌) 액티비티의 transitionState */
const ALIVE_TRANSITION_STATES = ['enter-active', 'enter-done'];

export type StackActivitySnapshot = {
  name: string;
  isActive: boolean;
  isRoot: boolean;
  transitionState: string;
};

export type StackSnapshot = { activities: StackActivitySnapshot[] };

export function isAliveActivity(activity: StackActivitySnapshot) {
  return ALIVE_TRANSITION_STATES.includes(activity.transitionState);
}

export function countAliveActivities(stack: StackSnapshot) {
  return stack.activities.filter(isAliveActivity).length;
}

/** Sentry breadcrumb·이벤트에 실을 수 있도록 스택을 납작한 값으로 요약한다 */
export function summarizeStack(stack: StackSnapshot) {
  const active = stack.activities.find((activity) => activity.isActive);

  return {
    depth: countAliveActivities(stack),
    active: active?.name ?? null,
    activeIsRoot: active?.isRoot ?? null,
    activities: stack.activities
      .map((activity) => `${activity.name}:${activity.transitionState}`)
      .join(' > '),
  };
}
