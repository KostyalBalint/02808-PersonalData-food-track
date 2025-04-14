import { Box } from "@mui/material";
import { FoodPyramid } from "./FoodPyramid.tsx";
import { FC, useEffect, useRef, useState } from "react";
import useSize from "@react-hook/size";
import { NutritionalData } from "../../../functions/src/constants.ts";
import { UserNutritionSettings } from "../../context/AuthContext.tsx";

type FoodPyramidWrapperProps = {
  consumedByCategory: NutritionalData;
  aimedAmountsByCategory: UserNutritionSettings;
};

const mapCategory: {
  [key in keyof NutritionalData]: keyof UserNutritionSettings;
} = {
  Vegetables: "vegetables",
  Grains: "carbohydrates",
  Dairy: "dairy",
  Meat: "protein",
  FatsOils: "fats",
  Sweet: "sweets",
};

export const nutritionCategoriesInfo: {
  [key in keyof NutritionalData]: {
    title: string;
    examples: string;
    advice: string;
  };
} = {
  Vegetables: {
    title: "Vegetables",
    examples:
      "Carrots, broccoli, peas, tomatoes, mixed salad, vegetable soup, orange juice, orange, fruit salad pot, apple, banana, berries.",
    advice:
      "Base your meals on these and enjoy a variety of colours. More is better. Limit fruit juice to unsweetened, once a day.",
  },
  Grains: {
    title: "Grains",
    examples:
      "Wholemeal bread, crispbread, breakfast cereals (flakes, bran), porridge/oats, pasta, rice, potatoes",
    advice:
      "Wholemeal and wholegrain cereals are best. Enjoy at each meal. The number of servings depends on age, size, if you are a man or a woman and on activity levels. Watch your serving size and use the Daily Servings Guide below.*",
  },
  Dairy: {
    title: "Dairy",
    examples:
      "Soft cheese, hard cheese block, grated cheese, glass of milk, low-fat yogurt pot, drinking yogurt/milkshake.",
    advice:
      "Choose reduced-fat or low-fat varieties. Choose low-fat milk and yogurt more often than cheese. Enjoy cheese in small amounts. Women who are pregnant or breastfeeding need 3 servings a day.",
  },
  Meat: {
    title: "Meat, fish, eggs, beans",
    examples:
      "Cooked chicken, walnuts, baked beans, eggs, lean red meat, cooked fish fillet (e.g., salmon).",
    advice:
      "Choose lean meat, poultry (without skin) and fish. Eat oily fish up to twice a week. Choose eggs, beans and nuts. Limit processed salty meats such as sausages, bacon and ham.",
  },
  FatsOils: {
    title: "Fats, Oils, Spreads",
    examples: "Cooking oil, mayonnaise, light spread tub, portioned spread.",
    advice:
      "Use as little as possible. Choose mono or polyunsaturated reduced-fat or light spreads. Choose rapeseed, olive, canola, sunflower or corn oils. Limit mayonnaise, coleslaw and salad dressings as they also contain oil. Always cook with as little fat or oil as possible – grilling, oven-baking, steaming, boiling or stir-frying.",
  },
  Sweet: {
    title: "High sugar or fat content",
    examples:
      "Cola, chocolate, biscuits/crackers, cupcake, sweets/candies, crisps/chips.",
    advice:
      "Most people consume snacks high in fat, sugar and salt and sugar sweetened drinks up to 6 times a day (Healthy Ireland Survey 2016). There are no recommended servings for Top Shelf foods and drinks because they are not needed for good health.",
  },
};

export const FoodPyramidWrapper: FC<FoodPyramidWrapperProps> = ({
  consumedByCategory,
  aimedAmountsByCategory,
}) => {
  const target = useRef(null);
  // @ts-expect-error ref object is set bellow on the element
  const [pyramidContainer] = useSize(target);
  const pyramidWidth = Math.min(pyramidContainer - 100, 500);

  useEffect(() => {
    Object.keys(consumedByCategory).map((categoryKey) => {
      const consumedAmount =
        consumedByCategory[categoryKey as keyof NutritionalData];

      let updatedPercentage = calculatePercentage(
        mapCategory[categoryKey as keyof NutritionalData],
        consumedAmount,
      );

      setPyramidData((prevData) =>
        prevData.map((item) =>
          item.key === categoryKey
            ? { ...item, percentage: updatedPercentage }
            : item,
        ),
      );
    });
  }, [consumedByCategory]);

  const calculatePercentage = (
    category: keyof UserNutritionSettings,
    consumedAmount: number,
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

  const [pyramidData, setPyramidData] = useState<
    {
      key: keyof NutritionalData;
      name: string;
      percentage: number;
      color: string;
      subtitle: string;
    }[]
  >([
    {
      key: "Vegetables",
      name: "Vegetables",
      percentage: 90,
      color: "#32CD32",
      subtitle: "5-7 servings",
    },
    {
      key: "Grains",
      name: "Grains",
      percentage: 120,
      color: "#DAA520",
      subtitle: "3-5 servings",
    },
    {
      key: "Dairy",
      name: "Dairy",
      percentage: 75,
      color: "#87CEFA",
      subtitle: "3 servings",
    },
    {
      key: "Meat",
      name: "Meat, fish, eggs, beans",
      percentage: 110,
      color: "#FF6347",
      subtitle: "2 servings",
    },
    {
      key: "FatsOils",
      name: "Fats And Oils",
      percentage: 30,
      color: "#FFD700",
      subtitle: "Use sparingly",
    },
    {
      key: "Sweet",
      name: "Sweets",
      percentage: 30,
      color: "#b15cc0",
      subtitle: "Mitigate",
    },
  ]);

  return (
    <Box ref={target}>
      <FoodPyramid pyramidData={pyramidData} pyramidWidth={pyramidWidth} />
    </Box>
  );
};
