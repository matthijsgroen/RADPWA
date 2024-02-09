export const createName = (prefix: string, existingNames: string[]) => {
  let counter = 1;
  let suggested = `${prefix}${counter}`;
  while (existingNames.includes(suggested)) {
    counter++;
    suggested = `${prefix}${counter}`;
  }
  return suggested;
};
