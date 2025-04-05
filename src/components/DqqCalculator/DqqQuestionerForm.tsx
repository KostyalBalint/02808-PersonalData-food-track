// src/components/DqqCalculator/DqqQuestionerForm.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  Typography,
} from "@mui/material";
import { db } from "../../firebaseConfig"; // Adjust path
import {
  doc,
  DocumentReference,
  DocumentSnapshot,
  FieldValue,
  FirestoreError,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  DqqAnswersMap,
  DqqQuestionKey,
  dqqQuestions,
  initialAnswersState,
} from "./dqqQuestions.ts";
import { MealData } from "../../../functions/src/constants.ts";

interface DqqQuestionerFormProps {
  mealId: string;
  disabled?: boolean; // To disable based on demographics
  onSaveStatusChange?: (isSaving: boolean) => void;
  onError?: (error: string | null) => void;
}

export function DqqQuestionerForm({
  mealId,
  disabled = false,
  onSaveStatusChange,
  onError,
}: DqqQuestionerFormProps) {
  const [answers, setAnswers] = useState<DqqAnswersMap>(initialAnswersState);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const mealDocRef = useMemo(
    () => doc(db, "meals", mealId) as DocumentReference<MealData>,
    [mealId],
  );

  // Fetch initial answers and listen for external changes (optional, but good practice)
  useEffect(() => {
    if (!mealId) {
      setError("No Meal ID provided for form.");
      setIsLoading(false);
      setAnswers(initialAnswersState);
      return;
    }
    setIsLoading(true);
    setError(null);
    onError?.(null); // Clear parent error on new load

    const unsubscribe = onSnapshot(
      mealDocRef,
      (docSnap: DocumentSnapshot<MealData>) => {
        const fetchedAnswers =
          docSnap.data()?.dqqData?.answers ?? initialAnswersState;
        // Only update local state if it differs and we are not currently saving
        // to avoid overriding user input during save latency.
        if (
          JSON.stringify(answers) !== JSON.stringify(fetchedAnswers) &&
          !isSaving
        ) {
          console.log(
            "DqqQuestionerForm: Received updated answers from Firestore.",
          );
          setAnswers(fetchedAnswers);
        }
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        console.error(
          "DqqQuestionerForm: Error fetching initial answers:",
          err,
        );
        const errorMsg = `Failed to load questions: ${err.message}.`;
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
    // Intentionally excluding 'answers' and 'isSaving' from deps to avoid loops.
    // We only want to fetch initial state or react to *external* changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, mealDocRef, onError]);

  const saveAnswers = useCallback(
    async (answersToSave: DqqAnswersMap) => {
      if (!mealId) return;
      setIsSaving(true);
      onSaveStatusChange?.(true);
      setError(null); // Clear local error on new save attempt
      onError?.(null); // Clear parent error
      console.log("DqqQuestionerForm: Saving answers...");

      try {
        const updatePayload = {
          "dqqData.answers": answersToSave,
          "dqqData.lastUpdated": serverTimestamp() as FieldValue,
        };
        await updateDoc(mealDocRef, updatePayload);
        console.log("DqqQuestionerForm: Answers save successful.");
      } catch (err) {
        console.error("DqqQuestionerForm: Error saving answers:", err);
        const firestoreError = err as FirestoreError;
        const errorMsg = `Failed to save answers: ${firestoreError.message}.`;
        setError(errorMsg); // Set local error
        onError?.(errorMsg); // Propagate error up
      } finally {
        setIsSaving(false);
        onSaveStatusChange?.(false);
      }
    },
    [mealId, mealDocRef, onSaveStatusChange, onError], // Dependencies
  );

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    const key = name as DqqQuestionKey;
    // Update local state immediately for responsiveness
    const newAnswers = { ...answers, [key]: checked };
    setAnswers(newAnswers);
    // Trigger save
    saveAnswers(newAnswers);
  };

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent
        sx={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="h6" component="h2">
            Diet Quality Questionnaire
          </Typography>
          {/* Optional: Show saving indicator here if needed */}
          {/* {isSaving && <CircularProgress size={20} />} */}
        </Box>
        <Typography variant="body2" color="textSecondary">
          Check the box if the food/drink was part of this meal
        </Typography>

        {/* Local Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        {/* Checkbox List */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: 2,
            opacity: disabled || isLoading ? 0.5 : 1, // Disable visually
          }}
        >
          <fieldset
            disabled={disabled || isSaving || isLoading} // Disable interactions
            style={{ border: "none", padding: 0, margin: 0 }}
          >
            {isLoading && <Typography>Loading questions...</Typography>}
            {!isLoading && (
              // Wrap the items in a Grid container
              <Grid container spacing={1}>
                {dqqQuestions.map((q) => (
                  // Each item is a Grid item
                  <Grid
                    size={{
                      xs: 12,
                      md: 6,
                    }}
                    key={q.key}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!answers?.[q.key as DqqQuestionKey]}
                          onChange={handleCheckboxChange}
                          name={q.key}
                          size="small"
                        />
                      }
                      label={q.label}
                      // Ensure label takes up available space if needed and aligns items
                      sx={{ display: "flex", width: "100%", mb: 0, mr: 0 }}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </fieldset>
        </Box>
      </CardContent>
    </Card>
  );
}
