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
  Grains: "carbohydrates",
  Sweets: "sweets",
  Fats: "fats",
  Protein: "protein",
  Fruits: "fruits",
  Dairy: "dairy",
  Vegetables: "vegetables",
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
      key: "Grains",
      name: "Carbohydrates",
      percentage: 120,
      color: "#DAA520",
      subtitle: "6-11 servings",
    },
    {
      key: "Vegetables",
      name: "Vegetables",
      percentage: 90,
      color: "#32CD32",
      subtitle: "3-5 servings",
    },
    {
      key: "Fruits",
      name: "Fruits",
      percentage: 60,
      color: "#FF69B4",
      subtitle: "2-4 servings",
    },
    {
      key: "Protein",
      name: "Protein",
      percentage: 110,
      color: "#FF6347",
      subtitle: "2-3 servings",
    },
    {
      key: "Dairy",
      name: "Dairy",
      percentage: 75,
      color: "#87CEFA",
      subtitle: "2-3 servings",
    },
    {
      key: "Fats",
      name: "Fats",
      percentage: 30,
      color: "#FFD700",
      subtitle: "Use sparingly",
    },
    {
      key: "Sweets",
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
