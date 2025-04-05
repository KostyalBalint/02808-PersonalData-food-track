import { Card, CardHeader, Chip, Container, Grid, Stack } from "@mui/material";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  CategoryAmounts,
  FoodPyramidWrapper,
} from "../components/FoodPyramid/FoodPyramidWrapper.tsx";
import { ProtectedComponent } from "../context/ProtectedComponent.tsx";
import FoodRecommendations from "../components/FoodRecommendations.tsx";
import FeatureFlagGuard from "../components/FeatureFlags/FeatureFlagGuard.tsx";

export const HomePage = () => {
  const { currentUser, userProfile } = useAuth();

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
      max: aimedAmountsByCategory.Grains * 5,
    },
    Vegetables: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Vegetables * 5,
    },
    Fruits: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Fruits * 5,
    },
    Protein: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Protein * 5,
    },
    Dairy: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.Dairy * 5,
    },
    FatsAndSweets: {
      amount: 0,
      min: 0,
      max: aimedAmountsByCategory.FatsAndSweets * 5,
    },
  });

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

  return (
    <Container sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
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
        </Grid>
        <ProtectedComponent allowedRoles={["SUBJECT", "ADMIN"]}>
          <Grid size={{ xs: 12 }}>
            <FoodRecommendations />
          </Grid>
        </ProtectedComponent>
        <ProtectedComponent allowedRoles={["SUBJECT", "ADMIN"]}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FeatureFlagGuard flagKey="food-pyramid">
              <FoodPyramidWrapper
                aimedAmountsByCategory={aimedAmountsByCategory}
                consumedByCategory={{
                  Grains: consumedByCategory.Grains.amount,
                  Vegetables: consumedByCategory.Vegetables.amount,
                  Fruits: consumedByCategory.Fruits.amount,
                  Protein: consumedByCategory.Protein.amount,
                  Dairy: consumedByCategory.Dairy.amount,
                  FatsAndSweets: consumedByCategory.FatsAndSweets.amount,
                }}
              />
            </FeatureFlagGuard>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FeatureFlagGuard flagKey="food-pyramid">
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
            </FeatureFlagGuard>
          </Grid>
        </ProtectedComponent>
      </Grid>
    </Container>
  );
};
