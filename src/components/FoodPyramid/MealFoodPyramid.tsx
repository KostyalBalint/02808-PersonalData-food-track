import { Typography } from "@mui/material"; // Import Slider, Box, CircularProgress
import { FC, useEffect, useState } from "react"; // Import useMemo
import { MealData, NutritionalData } from "../../../functions/src/constants.ts";
import { FoodPyramidWrapper } from "./FoodPyramidWrapper.tsx";
import { useAuth } from "../../context/AuthContext.tsx";

type MealFoodPyramidProps = {
  meals: MealData[] | null;
};

export const MealFoodPyramid: FC<MealFoodPyramidProps> = (props) => {
  const [sortedMeals, setSortedMeals] = useState<MealData[] | null>(null);

  const [numberOfSelectedDays, setNumberOfSelectedDays] = useState<number>(0);

  const { userProfile } = useAuth();
  const completedNutritionFacts = userProfile?.nutritionSettings !== undefined;

  console.log({ numberOfSelectedDays });

  useEffect(() => {
    if (!props.meals) {
      setSortedMeals(null);
      return;
    }

    const sorted = props.meals.sort(
      (a, b) => a.createdAt.seconds - b.createdAt.seconds,
    );
    setSortedMeals(sorted);

    if (sorted.length === 0) {
      setNumberOfSelectedDays(0);
    } else if (sorted.length === 1) {
      setNumberOfSelectedDays(1);
    } else {
      const diffInSec = Math.abs(
        sorted[0].createdAt.seconds -
          sorted[sorted.length - 1].createdAt.seconds,
      );
      const diffInDays = Math.ceil(diffInSec / (60 * 60 * 24));
      setNumberOfSelectedDays(diffInDays);
    }
  }, [props.meals]);

  const aimedAmountsByCategory = {
    protein: {
      min:
        (userProfile?.nutritionSettings?.protein?.min ?? 0) *
        numberOfSelectedDays,
      max:
        (userProfile?.nutritionSettings?.protein?.max ?? 0) *
        numberOfSelectedDays,
    },
    carbohydrates: {
      min:
        (userProfile?.nutritionSettings?.carbohydrates?.min ?? 0) *
        numberOfSelectedDays,
      max:
        (userProfile?.nutritionSettings?.carbohydrates?.max ?? 0) *
        numberOfSelectedDays,
    },
    dairy: {
      min:
        (userProfile?.nutritionSettings?.dairy?.min ?? 0) *
        numberOfSelectedDays,
      max:
        (userProfile?.nutritionSettings?.dairy?.max ?? 0) *
        numberOfSelectedDays,
    },
    vegetables: {
      min:
        (userProfile?.nutritionSettings?.vegetables?.min ?? 0) *
        numberOfSelectedDays,
      max:
        (userProfile?.nutritionSettings?.vegetables?.max ?? 0) *
        numberOfSelectedDays,
    },
    fats: {
      min:
        (userProfile?.nutritionSettings?.fats?.min ?? 0) * numberOfSelectedDays,
      max:
        (userProfile?.nutritionSettings?.fats?.max ?? 0) * numberOfSelectedDays,
    },
    sweets: {
      min:
        (userProfile?.nutritionSettings?.sweets?.min ?? 0) *
        numberOfSelectedDays,
      max:
        (userProfile?.nutritionSettings?.sweets?.max ?? 0) *
        numberOfSelectedDays,
    },
  };

  const defaultNutritionData: NutritionalData = {
    Grains: 0,
    Vegetables: 0,
    Meat: 0,
    Dairy: 0,
    FatsOils: 0,
    Sweet: 0,
  };

  const consumedByCategory: NutritionalData =
    sortedMeals?.reduce((prev, current) => {
      if (current.nutrition) {
        return {
          Grains: prev.Grains + (current.nutrition.Grains ?? 0),
          Vegetables: prev.Vegetables + (current.nutrition.Vegetables ?? 0),
          Meat: prev.Meat + (current.nutrition.Meat ?? 0),
          Dairy: prev.Dairy + (current.nutrition.Dairy ?? 0),
          FatsOils: prev.FatsOils + (current.nutrition.FatsOils ?? 0),
          Sweet: prev.Sweet + (current.nutrition.Sweet ?? 0),
        };
      }
      return prev;
    }, defaultNutritionData) ?? defaultNutritionData;

  // --- Render Logic ---

  if (!completedNutritionFacts) {
    return (
      <Typography>
        Default nutrition facts not set, contact Administrators
      </Typography>
    );
  }

  return (
    <FoodPyramidWrapper
      aimedAmountsByCategory={aimedAmountsByCategory}
      consumedByCategory={consumedByCategory}
    />
  );
};
