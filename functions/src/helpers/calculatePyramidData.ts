export const calculatePercentage = <
  T extends Record<string | number | symbol, any>,
  K extends Record<keyof T, { min?: number; max?: number }>,
>(
  category: keyof T,
  consumedAmount: number,
  aimedAmountsByCategory: K,
  offsetMultiplierAbove: number = 1,
  offsetMultiplierBelow: number = 1,
): number => {
  const aimedAmountLow = aimedAmountsByCategory[category]?.min ?? 0;
  const aimedAmountHigh = aimedAmountsByCategory[category]?.max ?? 0;

  if (
    consumedAmount > aimedAmountLow * offsetMultiplierBelow &&
    consumedAmount <= aimedAmountHigh * offsetMultiplierAbove
  ) {
    //In the aimed range -> 100%
    return 100;
  } else if (consumedAmount > aimedAmountHigh * offsetMultiplierAbove) {
    //Above the aimed range -> 100% + (what is above)
    return (
      100 +
      ((consumedAmount - aimedAmountHigh * offsetMultiplierAbove) /
        (aimedAmountHigh * offsetMultiplierAbove)) *
        100
    );
  } else {
    //Bellow aimed range -> 100% - (what we are bellow)
    return (
      100 -
      ((aimedAmountLow * offsetMultiplierBelow - consumedAmount) /
        (aimedAmountLow * offsetMultiplierBelow)) *
        100
    );
  }
};
