import { DqqResultsDisplay } from "../../components/DqqCalculator/DqqResultsDisplay.tsx";
import { useEffect, useState } from "react";
import {
  calculateDqqIndicators,
  DqqResultsState,
} from "../../components/DqqCalculator/calculateDqqIndicators.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import {
  initialAnswersState,
  initialDemographicsState,
} from "../../components/DqqCalculator/dqqQuestions.ts";
import { Container } from "@mui/material";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig.ts";
import { MealData } from "../../../functions/src/constants.ts";

export const AnalyzePage = () => {
  const { demographicsComplete, userProfile } = useAuth();
  const demographics = userProfile?.demographics ?? initialDemographicsState;

  const [results, setResults] = useState<Partial<DqqResultsState>[]>([]);
  const [meals, setMeals] = useState<MealData[]>([] as MealData[]);

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
    if (!demographicsComplete) {
      console.log(
        "DqqQuestionnaire: Demographics incomplete, clearing results.",
      );
      setResults([]); // Clear results if demographics are missing
      return;
    }

    if (!meals.length) {
      console.log("DqqQuestionnaire: No meals found.");
      setResults([]); // Clear results if no meals are found
      return;
    }

    setResults(
      meals.map((meal) =>
        calculateDqqIndicators(meal.dqqData?.answers, demographics),
      ),
    );
  }, [meals]);

  useEffect(() => {
    console.log(results);
  }, [results]);

  return (
    <Container sx={{ mt: 5 }}>
      <DqqResultsDisplay
        results={calculateDqqIndicators(initialAnswersState, demographics)}
        demographicsComplete={demographicsComplete}
      />
    </Container>
  );
};
