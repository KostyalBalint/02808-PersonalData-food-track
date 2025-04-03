// src/components/DqqCalculator/DqqQuestionnaire.tsx
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Grid, CircularProgress, Typography } from "@mui/material";
import { db } from "../../firebaseConfig"; // Adjust path
import {
  doc,
  DocumentReference,
  DocumentSnapshot,
  FirestoreError,
  onSnapshot,
} from "firebase/firestore";
import {
  calculateDqqIndicators,
  DqqResultsState,
} from "./calculateDqqIndicators"; // Adjust path
import { useAuth } from "../../context/AuthContext.tsx"; // Adjust path
import { DqqQuestionerForm } from "./DqqQuestionerForm"; // Import the new form
import { DqqResultsDisplay } from "./DqqResultsDisplay";
import {
  DqqAnswersMap,
  DqqDemographics,
  initialAnswersState,
  initialDemographicsState,
  MealDocument,
} from "./dqqQuestions.ts"; // Import the new display

interface DqqQuestionnaireProps {
  mealId: string;
  // Removed onSaveStatusChange and onError as they are primarily handled by the form now
  // You could add a top-level onError prop here if needed for fatal errors during data fetch.
  onInitializationError?: (error: string | null) => void;
}

export function DqqQuestionnaire({
  mealId,
  onInitializationError,
}: DqqQuestionnaireProps) {
  // State needed for calculation and coordination
  const [answers, setAnswers] = useState<DqqAnswersMap>(initialAnswersState);
  const [fetchedDemographics, setFetchedDemographics] = useState<
    Partial<DqqDemographics>
  >(initialDemographicsState);
  const [results, setResults] = useState<Partial<DqqResultsState>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // For fetch/init errors

  const mealDocRef = useMemo(
    () => doc(db, "meals", mealId) as DocumentReference<MealDocument>,
    [mealId],
  );

  const { userProfile } = useAuth();

  // --- Firestore Listener for Answers and Demographics ---
  useEffect(() => {
    if (!mealId) {
      setError("No Meal ID provided.");
      onInitializationError?.("No Meal ID provided.");
      setIsLoading(false);
      setAnswers(initialAnswersState);
      setFetchedDemographics(initialDemographicsState);
      return () => {}; // Return an empty function if no subscription was made
    }

    setIsLoading(true);
    setError(null);
    onInitializationError?.(null);

    // Listener for the meal document to get answers
    const unsubscribe = onSnapshot(
      mealDocRef,
      (docSnap: DocumentSnapshot<MealDocument>) => {
        const data = docSnap.data();
        const fetchedDqqData = data?.dqqData;

        const currentDemographics =
          userProfile?.demographics ?? initialDemographicsState; // Use userProfile demographics
        const currentAnswers = fetchedDqqData?.answers ?? initialAnswersState;

        // Update answers state if changed (this will trigger re-calculation)
        if (JSON.stringify(answers) !== JSON.stringify(currentAnswers)) {
          console.log(
            "DqqQuestionnaire: Received updated answers for calculation.",
          );
          setAnswers(currentAnswers);
        }

        if (
          JSON.stringify(fetchedDemographics) !==
          JSON.stringify(currentDemographics)
        ) {
          console.log("DqqQuestionnaire: Received updated demographics.");
          setFetchedDemographics(currentDemographics);
        }

        setIsLoading(false); // Considered loaded once we get the first snapshot
      },
      (err: FirestoreError) => {
        console.error("DqqQuestionnaire: Error fetching meal data:", err);
        const errorMsg = `Failed to load questionnaire data: ${err.message}.`;
        setError(errorMsg);
        onInitializationError?.(errorMsg);
        setIsLoading(false);
      },
    );

    return () => {
      console.log("DqqQuestionnaire: Unsubscribing listener.");
      unsubscribe();
    };
    // We only re-run the listener if mealId or userProfile reference changes.
    // answers/fetchedDemographics changes are handled *inside* the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, mealDocRef, userProfile, onInitializationError]);

  // --- Demographics Check ---
  const demographicsComplete = useMemo(() => {
    const demo = fetchedDemographics;
    return (
      demo?.Age !== null &&
      demo?.Age !== undefined && // Explicitly check undefined
      !isNaN(Number(demo?.Age)) &&
      demo?.Gender !== null &&
      demo?.Gender !== undefined // Explicitly check undefined
    );
  }, [fetchedDemographics]);

  // --- Calculate Results ---
  useEffect(() => {
    if (!demographicsComplete) {
      console.log(
        "DqqQuestionnaire: Demographics incomplete, clearing results.",
      );
      setResults({}); // Clear results if demographics are missing
      return;
    }
    console.log("DqqQuestionnaire: Recalculating DQQ indicators...");
    const calculated = calculateDqqIndicators(answers, fetchedDemographics);
    setResults(calculated);
  }, [answers, fetchedDemographics, demographicsComplete]); // Recalculate when these change

  // Handle overall loading state
  if (isLoading && !error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 3,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Questionnaire...</Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Display Initialization/Fetch Errors */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Demographics Warning (if needed outside the results component) */}
      {!isLoading && !error && !demographicsComplete && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please fill out your Age and Gender in the Settings page to enable
          calculation.
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Questions Section - Render the Form Component */}
        <Grid item xs={12} md={7}>
          <DqqQuestionerForm
            mealId={mealId}
            disabled={!demographicsComplete || isLoading} // Disable form if no demos or still loading
            // Pass optional callbacks if needed by the parent component for fine-grained status
            // onSaveStatusChange={...}
            // onError={...}
          />
        </Grid>

        {/* Results Section - Render the Display Component */}
        <Grid item xs={12} md={5}>
          <DqqResultsDisplay
            results={results}
            demographicsComplete={demographicsComplete}
          />
        </Grid>
      </Grid>
    </>
  );
}
