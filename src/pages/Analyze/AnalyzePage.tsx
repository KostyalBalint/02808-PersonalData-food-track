import { DqqResultsDisplay } from "../../components/DqqCalculator/DqqResultsDisplay.tsx";
import { useCallback, useEffect, useState } from "react";
import {
  calculateDqqIndicators,
  DqqResultsState,
} from "../../components/DqqCalculator/calculateDqqIndicators.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import {
  DqqAnswersMap,
  initialAnswersState,
  initialDemographicsState,
} from "../../components/DqqCalculator/dqqQuestions.ts";
import {
  Card,
  CardHeader,
  Container,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig.ts";
import { MealData } from "../../../functions/src/constants.ts";
import DqqTimeChart, { DqqTimeChartDataPoint } from "./DqqTimeChart.tsx";
import { format } from "date-fns";
import { mergeMultipleDQQ } from "../../components/DqqCalculator/mergeMultipleDQQ.ts";
import { ChartToggleWrapper } from "./ChartToggleWrapper.tsx";
import FeatureFlagGuard from "../../components/FeatureFlags/FeatureFlagGuard.tsx";

export const AnalyzePage = () => {
  const { demographicsComplete, userProfile } = useAuth();
  const demographics = userProfile?.demographics ?? initialDemographicsState;

  const [results, setResults] = useState<
    {
      results: Partial<DqqResultsState>;
      meals: MealData[];
      timestamp: string;
    }[]
  >([]);
  const [meals, setMeals] = useState<MealData[]>([] as MealData[]);

  const [selectedResult, setSelectedResult] = useState<{
    results: Partial<DqqResultsState>;
    meals: MealData[];
    timestamp: string;
  }>({
    results: calculateDqqIndicators(initialAnswersState, demographics),
    meals: [],
    timestamp: "",
  });

  //Get all the meals
  useEffect(() => {
    if (!userProfile) return;

    const q = query(
      collection(db, "meals"),
      where("userId", "==", userProfile.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userMeals = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MealData[];
      setMeals(userMeals);
    });

    // Cleanup function
    return () => unsubscribe();
  }, [userProfile]);

  useEffect(() => {
    if (!meals) return;

    // Group meals by day
    const mealsByDay = meals.reduce(
      (acc, meal) => {
        const date = meal.createdAt.toDate();
        const dayKey = format(date, "yyyy-MM-dd");

        if (!acc[dayKey]) {
          acc[dayKey] = [];
        }

        acc[dayKey].push(meal);
        return acc;
      },
      {} as Record<string, MealData[]>,
    );

    setResults(
      Object.keys(mealsByDay).map((dayKey) => {
        const mealsForDay = mealsByDay[dayKey];

        const answer = mergeMultipleDQQ(
          mealsForDay
            .map((meal) => meal.dqqData?.answers)
            .map((a) => a) as DqqAnswersMap[],
        );

        return {
          results: calculateDqqIndicators(answer, demographics),
          timestamp: dayKey,
          meals: mealsForDay,
        };
      }),
    );
  }, [meals]);

  useEffect(() => {
    console.log({ results });
  }, [results]);

  const chartData = results.map(
    (result, id) =>
      ({
        resultId: id,
        ncdProtectScore: result.results.ncdp,
        gdrScore: result.results.gdr,
        ncdRiskScore: result.results.ncdr,
        timestamp: result.timestamp,
        mealCount: result.meals.length,
      }) as DqqTimeChartDataPoint,
  );

  const onChartHover = useCallback(
    (dataPoint: DqqTimeChartDataPoint | null) => {
      if (!dataPoint) return;
      setSelectedResult(results[dataPoint.resultId]);
    },
    [results],
  );

  return (
    <Container sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <FeatureFlagGuard flagKey="why-home-empty-inform">
          <Grid size={{ xs: 12 }}>
            <Card sx={{ width: "100%" }}>
              <CardHeader title="Why is this page empty?" />
              <Typography
                p={2}
                variant="body2"
                color="text.secondary"
                gutterBottom
                sx={{ width: "100%" }}
              >
                We have features coming up here. As the experiment progresses,
                you can access more features here.
              </Typography>
            </Card>
          </Grid>
        </FeatureFlagGuard>
        <Grid size={{ xs: 12, md: 8, xl: 6 }}>
          <FeatureFlagGuard flagKey="meal-analysis">
            <Paper sx={{ py: 2, pr: 2 }}>
              <ChartToggleWrapper
                title="DQQ Scores over time" // Pass title to the wrapper
                initialChartType="line" // Optional: set default
                // lineLabel="Trend" // Optional: customize labels
                // barLabel="Daily Scores" // Optional: customize labels
              >
                {/* DqqTimeChart is now the child */}
                {chartData.length > 0 ? (
                  <DqqTimeChart
                    data={chartData}
                    onHover={onChartHover}
                    // chartType prop is now provided by ChartToggleWrapper
                    chartType="line" // Only add this bc. TS
                  />
                ) : (
                  // Display message within the wrapper if no data
                  <Typography sx={{ mt: 4, textAlign: "center" }}>
                    No data available to display chart.
                  </Typography>
                )}
              </ChartToggleWrapper>
            </Paper>
            {/*
            <Paper>
                <Grid container spacing={1}>
                  {selectedResult.meals.map((meal) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={meal.id}>
                      <MealCard meal={meal} />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
             */}
          </FeatureFlagGuard>
        </Grid>
        <Grid size={{ xs: 12, md: 4, xl: 6 }}>
          <FeatureFlagGuard flagKey="meal-analysis">
            {selectedResult && (
              <DqqResultsDisplay
                results={selectedResult.results}
                demographicsComplete={demographicsComplete}
              />
            )}
          </FeatureFlagGuard>
        </Grid>
      </Grid>
    </Container>
  );
};
