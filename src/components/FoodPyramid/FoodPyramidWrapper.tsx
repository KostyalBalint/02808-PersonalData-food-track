import { Card, CardHeader } from "@mui/material";
import { FoodPyramid } from "./FoodPyramid.tsx";
import { FC, useEffect, useRef, useState } from "react";
import useSize from "@react-hook/size";

export interface CategoryAmounts {
  Grains: number;
  Vegetables: number;
  Fruits: number;
  Protein: number;
  Dairy: number;
  FatsAndSweets: number;
}

type FoodPyramidWrapperProps = {
  consumedByCategory: CategoryAmounts;
  aimedAmountsByCategory: CategoryAmounts;
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
      const amount = consumedByCategory[categoryKey as keyof CategoryAmounts];

      let updatedPercentage = 0;
      switch (categoryKey as keyof CategoryAmounts) {
        case "Grains":
          updatedPercentage = calculatePercentageForGrains(amount);
          break;
        case "Vegetables":
          updatedPercentage = calculatePercentageForVegetables(amount);
          break;
        case "Fruits":
          updatedPercentage = calculatePercentageForFruit(amount, 101);
          break;
        case "Protein":
          updatedPercentage = calculatePercentageForProtein(amount);
          break;
        case "FatsAndSweets":
          updatedPercentage = calculatePercentageForFatsAndSweets(amount);
          break;
        default:
          updatedPercentage = 100;
      }

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
    category: keyof CategoryAmounts,
    consumedAmount: number,
    offsetMultiplierAbove: number,
    offsetMultiplierBelow: number,
  ): number => {
    const aimedAmount = aimedAmountsByCategory[category];
    if (
      consumedAmount > aimedAmount * offsetMultiplierBelow &&
      consumedAmount <= aimedAmount * offsetMultiplierAbove
    ) {
      return 100;
    } else if (consumedAmount > aimedAmount * offsetMultiplierAbove) {
      return (
        100 +
        ((consumedAmount - aimedAmount * offsetMultiplierAbove) /
          (aimedAmount * offsetMultiplierAbove)) *
          100
      );
    } else {
      return (
        100 -
        ((aimedAmount * offsetMultiplierBelow - consumedAmount) /
          (aimedAmount * offsetMultiplierBelow)) *
          100
      );
    }
  };

  const calculatePercentageForGrains = (grainInGrams: number): number => {
    return calculatePercentage("Grains", grainInGrams, 1.3, 0.5);
  };

  const calculatePercentageForFatsAndSweets = (fatsInGrams: number): number => {
    if (fatsInGrams < aimedAmountsByCategory.FatsAndSweets) {
      return 100;
    } else {
      return 100 + (fatsInGrams - aimedAmountsByCategory.FatsAndSweets) * 3;
    }
  };

  const calculatePercentageForVegetables = (
    vegetableInGrams: number,
  ): number => {
    return calculatePercentage("Vegetables", vegetableInGrams, 2, 0.8);
  };

  const calculatePercentageForProtein = (proteinInGrams: number): number => {
    return calculatePercentage("Protein", proteinInGrams, 2.5, 0.5);
  };

  const calculatePercentageForFruit = (
    amount: number,
    fruitInGrams: number,
  ): number => {
    let fruitAmount = consumedByCategory.Fruits;
    if (fruitInGrams > 100) {
      fruitAmount += 1;
    } else {
      fruitAmount = amount / 120;
    }
    return calculatePercentage("Fruits", fruitAmount, 2, 0.5);
  };

  const [pyramidData, setPyramidData] = useState<
    {
      key: keyof CategoryAmounts;
      name: string;
      percentage: number;
      color: string;
      subtitle: string;
    }[]
  >([
    {
      key: "Grains",
      name: "Grains",
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
      key: "FatsAndSweets",
      name: "Fats, Sweets",
      percentage: 30,
      color: "#FFD700",
      subtitle: "Use sparingly",
    },
  ]);

  return (
    <Card ref={target}>
      <CardHeader title="Your food pyramid" />
      <FoodPyramid pyramidData={pyramidData} pyramidWidth={pyramidWidth} />
    </Card>
  );
};
