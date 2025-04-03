import { Card, CardHeader, Chip, Container, Grid2, Stack } from "@mui/material";
import { FoodPyramid } from "../components/FoodPyramid/FoodPyramid.tsx";
import { useEffect, useRef, useState } from "react";
import useSize from "@react-hook/size";
import { useAuth } from "../context/AuthContext";

export interface CategoryAmounts {
  Grains: number;
  Vegetables: number;
  Fruits: number;
  Protein: number;
  Dairy: number;
  FatsAndSweets: number;
}

export const HomePage = () => {
  const { currentUser, userProfile } = useAuth();

  console.log(userProfile);

  const aimedAmountsByCategory: CategoryAmounts = {
    Grains: 300, // g
    Vegetables: 850, // g
    Fruits: 2, // count
    Protein: 37, // count
    Dairy: 3, // ml or count
    FatsAndSweets: 20, // g
  };

  const [consumedByCategory, setConsumedByCategory] = useState<{
    [key in keyof CategoryAmounts]: {
      amount: number;
      min: number;
      max: number;
    };
  }>({
    Grains: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Grains * 2,
    },
    Vegetables: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Vegetables * 2,
    },
    Fruits: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Fruits * 2,
    },
    Protein: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Protein * 2,
    },
    Dairy: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Dairy * 2,
    },
    FatsAndSweets: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.FatsAndSweets * 2,
    },
  });

  useEffect(() => {
    Object.keys(consumedByCategory).map((categoryKey) => {
      const category = consumedByCategory[categoryKey as keyof CategoryAmounts];

      let updatedPercentage = 0;
      switch (categoryKey as keyof CategoryAmounts) {
        case "Grains":
          updatedPercentage = calculatePercentageForGrains(category.amount);
          break;
        case "Vegetables":
          updatedPercentage = calculatePercentageForVegetables(category.amount);
          break;
        case "Fruits":
          updatedPercentage = calculatePercentageForFruit(category.amount, 101);
          break;
        case "Protein":
          updatedPercentage = calculatePercentageForProtein(category.amount);
          break;
        case "FatsAndSweets":
          updatedPercentage = calculatePercentageForFatsAndSweets(
            category.amount,
          );
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
    let fruitAmount = consumedByCategory.Fruits.amount;
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

  const updateConsumedAmount = (
    category: keyof CategoryAmounts,
    amount: number,
  ) => {
    setConsumedByCategory((prevState) => ({
      ...prevState,
      [category]: {
        ...prevState[category],
        amount: amount,
      },
    }));
  };

  const target = useRef(null);
  // @ts-expect-error ref object is set bellow on the element
  const [pyramidContainer] = useSize(target);

  const pyramidWidth = Math.min(pyramidContainer - 100, 500);

  return (
    <Container sx={{ mt: 2 }}>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" gap={2} alignItems={"center"}>
                  Hi, {currentUser?.displayName}
                  <Chip label={userProfile?.role} />
                </Stack>
              }
            ></CardHeader>
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card ref={target}>
            <CardHeader title="Your food pyramid" />
            <FoodPyramid
              pyramidData={pyramidData}
              pyramidWidth={pyramidWidth}
            />
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card>
            {/* Controls section - moved below the pyramid */}
            <div className="w-full m-4 max-w-lg bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-3">
                Adjust Food Group Percentages
              </h3>
              {Object.keys(consumedByCategory).map((categoryKey) => {
                //as keyof CategoryAmounts
                const category =
                  consumedByCategory[categoryKey as keyof CategoryAmounts];
                return (
                  <div
                    key={`control-${categoryKey}`}
                    className="mb-3 flex items-center"
                  >
                    <div className="w-32 mr-2 font-medium text-sm">
                      {categoryKey}:
                    </div>
                    <input
                      type="range"
                      min={category.min}
                      max={category.max}
                      value={category.amount}
                      onChange={(e) => {
                        //updatePercentage(category.id, Number(e.target.value))
                        updateConsumedAmount(
                          categoryKey as keyof CategoryAmounts,
                          Number(e.target.value),
                        );
                      }}
                      className="flex-grow mr-2"
                    />
                    <span className="w-10 text-right font-bold">
                      {category.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </Grid2>
      </Grid2>
    </Container>
  );
};
