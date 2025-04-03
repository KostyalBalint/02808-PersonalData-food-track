import { DqqResultsDisplay } from "../../components/DqqCalculator/DqqResultsDisplay.tsx";
import { useCallback, useEffect, useState } from "react";
import {
  calculateDqqIndicators,
  DqqResultsState,
} from "../../components/DqqCalculator/calculateDqqIndicators.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import {
  initialAnswersState,
  initialDemographicsState,
} from "../../components/DqqCalculator/dqqQuestions.ts";
import { Container, Grid } from "@mui/material";
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

export const AnalyzePage = () => {
  const { demographicsComplete, userProfile } = useAuth();
  const demographics = userProfile?.demographics ?? initialDemographicsState;

  const [results, setResults] = useState<Partial<DqqResultsState>[]>([]);
  const [meals, setMeals] = useState<MealData[]>([] as MealData[]);

  const [selectedResult, setSelectedResult] = useState<
    Partial<DqqResultsState>
  >(calculateDqqIndicators(initialAnswersState, demographics));

  const { currentUser } = useAuth();

  //Get all the meals
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "meals"),
      where("userId", "==", currentUser.uid),
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
  }, [currentUser]);

  useEffect(() => {
    if (!meals) return;
    setResults(
      meals.map((meal) =>
        calculateDqqIndicators(meal.dqqData?.answers, demographics),
      ),
    );
  }, [meals]);

  useEffect(() => {
    console.log({ results });
  }, [results]);

  const chartData = results.map(
    (result, id) =>
      ({
        resultId: id,
        ncdProtectScore: (result.ncdp ?? 0) + (result.gdr ?? NaN),
        gdrScore: result.gdr,
        ncdRiskScore: (result.gdr ?? 0) - (result.ncdr ?? NaN),
        timestamp: meals[id].createdAt.toDate(),
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
    <Container sx={{ mt: 5 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DqqTimeChart
            data={chartData}
            title="Patient Health Scores Over Time"
            onHover={onChartHover}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {selectedResult && (
            <DqqResultsDisplay
              results={selectedResult}
              demographicsComplete={demographicsComplete}
            />
          )}
        </Grid>
      </Grid>
    </Container>
  );
};
