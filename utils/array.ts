export const ensureArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
};
