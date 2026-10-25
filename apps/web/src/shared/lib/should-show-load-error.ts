export function shouldShowLoadError(isError: boolean, data: unknown): boolean {
  return isError && !data;
}
