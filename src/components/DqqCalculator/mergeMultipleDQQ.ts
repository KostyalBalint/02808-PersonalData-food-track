export const mergeMultipleDQQ = <
  T extends Record<string | number | symbol, boolean | undefined>,
>(
  inputArray: T[],
): { [P in keyof T]: boolean } => {
  // Handle the edge case of an empty input array
  if (inputArray.length === 0) {
    // We cannot determine keys from an empty array, so return an empty object.
    // The type assertion is necessary because the return type expects keys from T.
    return {} as { [P in keyof T]: boolean };
  }

  // Get the keys from the first object (assuming all objects have the same keys)
  // Use Reflect.ownKeys for broader key type support (string | symbol) if needed,
  // but Object.keys is fine for string keys often implied by Record<string, ...>.
  const keys = Object.keys(inputArray[0]) as Array<keyof T>;

  // Initialize the result object. We start with all keys set to false.
  // This correctly handles cases where all values for a key are false or undefined.
  const mergedObject = {} as { [P in keyof T]: boolean };
  for (const key of keys) {
    mergedObject[key] = false;
  }

  // Iterate through each object in the input array
  for (const obj of inputArray) {
    // Iterate through each key
    for (const key of keys) {
      // If the current object has `true` for this key, set the
      // corresponding key in the result to `true`.
      // Since we initialized with `false`, this effectively performs a
      // logical OR operation across all objects for this key.
      // `undefined` values will not satisfy `=== true`, correctly treating them as false.
      // @ts-ignore
      if (obj[key] === true) {
        mergedObject[key] = true;
        // Optimization: If a key is already true, we could technically
        // stop checking it for this specific key in subsequent objects,
        // but iterating through all is simpler and often fast enough.
      }
    }
  }

  return mergedObject;
};
