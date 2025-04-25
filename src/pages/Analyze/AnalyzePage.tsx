import {
  DDSScoreTooltipInfo,
  DqqResultsDisplay,
} from "../../components/DqqCalculator/DqqResultsDisplay.tsx";
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
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
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
import { format, toDate } from "date-fns";
import { mergeMultipleDQQ } from "../../components/DqqCalculator/mergeMultipleDQQ.ts";
import { ChartToggleWrapper } from "./ChartToggleWrapper.tsx";
import FeatureFlagGuard from "../../components/FeatureFlags/FeatureFlagGuard.tsx";
import { MealFoodPyramid } from "../../components/FoodPyramid/MealFoodPyramid.tsx";

export const AnalyzePage = () => {
  const { demographicsComplete, userProfile } = useAuth();
  const demographics = userProfile?.demographics ?? initialDemographicsState;

  const [dailyDqq, setDailyDqq] = useState<
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

    setDailyDqq(
      Object.keys(mealsByDay)
        .map((dayKey) => {
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
        })
        .sort(
          (a, b) =>
            toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime(),
        ),
    );
  }, [meals]);

  const chartData = dailyDqq.map(
    (result, id) =>
      ({
        resultId: id,
        fgdsScore: result.results.fgds,
        ncdProtectScore: result.results.ncdp,
        gdrScore: result.results.gdr,
        ncdRiskScore: result.results.ncdr,
        timestamp: result.timestamp,
        mealCount: result.meals.length,
      }) as DqqTimeChartDataPoint,
  );

  const onRangeSelect = useCallback(
    (selected: DqqTimeChartDataPoint[] | DqqTimeChartDataPoint | null) => {
      if (!selected) return;
      if (!Array.isArray(selected)) {
        setSelectedResult(dailyDqq[selected.resultId]);
      } else {
        const mealsInRange = selected.reduce((prev, current) => {
          return [...dailyDqq[current.resultId].meals, ...prev];
        }, [] as MealData[]);

        const answer = mergeMultipleDQQ(
          mealsInRange
            .map((meal) => meal.dqqData?.answers)
            .map((a) => a) as DqqAnswersMap[],
        );

        setSelectedResult({
          meals: mealsInRange,
          results: calculateDqqIndicators(answer, demographics),
          timestamp: `${format(mealsInRange[0].createdAt.toDate(), "yyyy-MM-dd")} - ${format(mealsInRange[mealsInRange.length - 1].createdAt.toDate(), "yyyy-MM-dd")}`,
        });
      }
    },
    [dailyDqq],
  );

  const onHover = useCallback(
    (selected: DqqTimeChartDataPoint | null) => {
      if (!selected) return;
      setSelectedResult(dailyDqq[selected.resultId]);
    },
    [dailyDqq],
  );

  return (
    <Container sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FeatureFlagGuard flagKey="analyse-food-pyramid">
            <Paper sx={{ overflow: "hidden" }}>
              <Stack justifyContent="center">
                <MealFoodPyramid meals={selectedResult.meals} />
                <Typography variant="body2" color="textSecondary">
                  {selectedResult.timestamp}
                </Typography>
              </Stack>
            </Paper>
          </FeatureFlagGuard>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <FeatureFlagGuard flagKey="dds-score-over-time">
            <Paper sx={{ py: 2, pr: 2 }}>
              <ChartToggleWrapper
                title="DDS Scores over time" // Pass title to the wrapper
                subtitle="Food Group Diversity Score, larger is better"
                initialChartType="line" // Optional: set default
                infoToolTip={<DDSScoreTooltipInfo />}
                // lineLabel="Trend" // Optional: customize labels
                // barLabel="Daily Scores" // Optional: customize labels
              >
                {/* DqqTimeChart is now the child */}
                {chartData.length > 0 ? (
                  <DqqTimeChart
                    data={chartData}
                    onRangeSelect={onRangeSelect}
                    // chartType prop is now provided by ChartToggleWrapper
                    chartType="line" // Only add this bc. TS
                    showFeatures={{
                      fgds: true,
                    }}
                    valueRange={[0, 10]}
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
        <Grid size={{ xs: 12 }}>
          <Divider />
        </Grid>
        <Grid size={{ xs: 12, md: 8, xl: 6 }}>
          <FeatureFlagGuard flagKey="meal-analysis">
            <Paper sx={{ py: 2, pr: 2 }}>
              <ChartToggleWrapper
                title="DQI Scores over time" // Pass title to the wrapper
                initialChartType="line" // Optional: set default
                infoToolTip={
                  <>
                    <Typography variant="body2">
                      <Typography
                        variant="subtitle2"
                        component="span"
                        fontWeight="bold"
                      >
                        Definition
                      </Typography>
                      <br />
                      The global dietary recommendations (GDR) score has two
                      components, NCD-Protect and NCD-Risk. It is based on food
                      consumption from nine health-protective food groups
                      (NCD-Protect) and eight food groups to limit or avoid
                      (NCD-Risk) during the previous day or night. The score
                      ranges from 0 to 18 with higher scores indicating more
                      recommendations met.
                      <br />
                      <br />
                      <i>
                        (NCD is an abbreviation for non-communicable diseases,
                        also known as chronic diseases, such as Stroke, Cancer,
                        Diabetes.)
                      </i>
                      <br />
                      <br />
                      <Typography
                        variant="subtitle2"
                        component="span"
                        fontWeight="bold"
                      >
                        Relevance
                      </Typography>
                      <br />A higher Global Dietary Recommendations (GDR) score
                      reflects meeting global dietary recommendations of the
                      WHO."
                    </Typography>
                  </>
                }
                // lineLabel="Trend" // Optional: customize labels
                // barLabel="Daily Scores" // Optional: customize labels
              >
                {/* DqqTimeChart is now the child */}
                {chartData.length > 0 ? (
                  <DqqTimeChart
                    data={chartData}
                    showFeatures={{
                      gdr: true,
                      ncdp: true,
                      ncdr: true,
                    }}
                    onHover={onHover}
                    valueRange={[0, 18]}
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
