export function isQaToolEnabled() {
  return process.env.EXPO_PUBLIC_QA_TOOL_ENABLED === 'true';
}
