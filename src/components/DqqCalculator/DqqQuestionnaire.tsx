// src/components/DqqCalculator/DqqQuestionnaire.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  Typography,
  useTheme,
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
  DqqDemographics,
  DqqQuestionKey,
  dqqQuestions,
  initialAnswersState,
  initialDemographicsState,
  MealDocument,
} from "./dqqQuestions";
import {
  calculateDqqIndicators,
  DqqResultsState,
} from "./calculateDqqIndicators";
import { IndicatorRow } from "./IndicatorRow"; // Import the new helper
import { useAuth } from "../../context/AuthContext.tsx";

interface DqqQuestionnaireProps {
  mealId: string;
  onSaveStatusChange?: (isSaving: boolean) => void;
  onError?: (error: string | null) => void;
}

//TODO: Make component reusable, so that it is not bound to one meal
//TODO: Fill out calculation from image with AI

export function DqqQuestionnaire({
  mealId,
  onSaveStatusChange,
  onError,
}: DqqQuestionnaireProps) {
  const theme = useTheme(); // Get theme for colors
  // --- State (keep existing state variables) ---
  const [answers, setAnswers] = useState<DqqAnswersMap>(initialAnswersState);
  const [fetchedDemographics, setFetchedDemographics] = useState<
    Partial<DqqDemographics>
  >(initialDemographicsState);
  const [results, setResults] = useState<Partial<DqqResultsState>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mealDocRef = useMemo(
    () => doc(db, "meals", mealId) as DocumentReference<MealDocument>,
    [mealId],
  );

  const { userProfile } = useAuth();

  const saveAnswers = useCallback(
    async (answersToSave: DqqAnswersMap) => {
      if (!mealId) return;
      setIsSaving(true);
      onSaveStatusChange?.(true);
      setError(null);
      onError?.(null);
      console.log("DqqQuestionnaire: Saving answers...");

      try {
        const updatePayload = {
          "dqqData.answers": answersToSave,
          "dqqData.lastUpdated": serverTimestamp() as FieldValue,
        };
        await updateDoc(mealDocRef, updatePayload);
        console.log("DqqQuestionnaire: Answers save successful.");
      } catch (err) {
        console.error("DqqQuestionnaire: Error saving answers:", err);
        const firestoreError = err as FirestoreError;
        const errorMsg = `Failed to save answers: ${firestoreError.message}.`;
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsSaving(false);
        onSaveStatusChange?.(false);
      }
    },
    [mealId, mealDocRef, onSaveStatusChange, onError], // Dependencies
  );

  // --- Firestore Listener (keep existing logic) ---
  useEffect(() => {
    if (!mealId) {
      setError("No Meal ID provided.");
      setIsLoading(false);
      setAnswers(initialAnswersState);
      setFetchedDemographics(initialDemographicsState);
      return;
    }
    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      mealDocRef,
      (docSnap: DocumentSnapshot<MealDocument>) => {
        const data = docSnap.data();
        const fetchedDqqData = data?.dqqData;

        const currentDemographics =
          userProfile?.demographics ?? initialDemographicsState; // Use userProfile demographics
        const currentAnswers = fetchedDqqData?.answers ?? initialAnswersState;

        setFetchedDemographics(currentDemographics);
        setAnswers((prevAnswers) => {
          if (
            JSON.stringify(prevAnswers) !== JSON.stringify(currentAnswers) &&
            !isSaving
          ) {
            return { ...initialAnswersState, ...currentAnswers };
          }
          return prevAnswers;
        });
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        console.error("DqqQuestionnaire: Error fetching data:", err);
        setError(`Failed to load questionnaire data: ${err.message}.`);
        onError?.(`Failed to load questionnaire data: ${err.message}.`);
        setIsLoading(false);
      },
    );
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealId, mealDocRef, isSaving, onError, userProfile?.demographics]); // Add userProfile?.demographics dependency

  // --- Demographics Check (keep existing logic) ---
  const demographicsComplete = useMemo(() => {
    const demo = fetchedDemographics;
    // Use isNaN check correctly with potential null/undefined
    return (
      demo?.Age !== null && !isNaN(Number(demo?.Age)) && demo?.Gender !== null
    );
  }, [fetchedDemographics]);

  // --- Calculate Results (keep existing logic) ---
  useEffect(() => {
    if (!demographicsComplete) {
      setResults({});
      return;
    }
    const calculated = calculateDqqIndicators(answers, fetchedDemographics);
    setResults(calculated);
  }, [answers, fetchedDemographics, demographicsComplete]);

  // --- Input Handler (keep existing logic) ---
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    const key = name as DqqQuestionKey;
    const newAnswers = { ...answers, [key]: checked };
    setAnswers(newAnswers);
    saveAnswers(newAnswers);
  };

  // Helper function to safely get scores
  const getScore = (key: keyof DqqResultsState): number => {
    const value = results[key];
    return typeof value === "number" && !isNaN(value) ? value : 0;
  };

  const gdrScore = getScore("gdr");
  const ncdRiskScore = getScore("ncdr");
  const ncdProtectScore = getScore("ncdp");
  // Define max scores for bar width calculation (adjust if necessary based on R script/logic)
  const maxRiskScore = 8; // Max possible based on 8 items in ncdr calc
  const maxProtectScore = 9; // Max possible based on 9 items in ncdp calc
  //const totalMaxScore = maxRiskScore + maxProtectScore; // For proportional width if needed

  // Calculate bar widths (capped at 100% for each side relative to its max)
  const riskWidthPercent = Math.min(50, (ncdRiskScore / maxRiskScore) * 50);
  const protectWidthPercent = Math.min(
    50,
    (ncdProtectScore / maxProtectScore) * 50,
  );

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {" "}
          {error}{" "}
        </Alert>
      )}
      {!demographicsComplete && !isLoading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please fill out your demographic information in the Settings page
        </Alert>
      )}
      <Grid container spacing={4}>
        {/* Questions Section (Remains the same) */}
        <Grid item xs={12} md={7}>
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
                  {" "}
                  Food Consumption (Yesterday){" "}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" paragraph>
                Check the box if the food/drink was consumed in the last 24
                hours.
              </Typography>
              {/* Checkbox List */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  pr: 1,
                  opacity: !demographicsComplete ? 0.5 : 1,
                }}
              >
                <fieldset
                  disabled={!demographicsComplete}
                  style={{ border: "none", padding: 0, margin: 0 }}
                >
                  {dqqQuestions.map((q) => (
                    <FormControlLabel
                      key={q.key}
                      control={
                        <Checkbox
                          checked={!!answers?.[q.key as DqqQuestionKey]}
                          onChange={handleCheckboxChange}
                          name={q.key}
                          size="small"
                        />
                      }
                      label={q.label}
                      sx={{ display: "flex", mb: 0.5, mr: 0 }}
                    />
                  ))}
                </fieldset>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Section *** MODIFIED *** */}
        <Grid item xs={12} md={5}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent
              sx={{ display: "flex", flexDirection: "column", height: "100%" }}
            >
              <Typography variant="h6" gutterBottom component="h2">
                Calculated Indicators
              </Typography>

              {!demographicsComplete ? (
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography sx={{ mt: 2 }} color="textSecondary">
                    Complete demographic information to view indicators.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* --- Top Scores --- */}
                  <Box
                    sx={{
                      textAlign: "center",
                      mb: 1,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      pb: 2,
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="p"
                      sx={{ mb: 1, fontWeight: "medium" }}
                    >
                      GDR Score - {gdrScore.toFixed(1)}
                    </Typography>
                    <Grid
                      container
                      spacing={1}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Grid
                        item
                        xs={6}
                        sx={{
                          textAlign: "right",
                          pr: 1,
                          borderRight: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography variant="body1">
                          NCD-Risk Score - {ncdRiskScore.toFixed(1)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: "left", pl: 1 }}>
                        <Typography variant="body1">
                          NCD-Protect Score - {ncdProtectScore.toFixed(1)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* --- Bar Chart --- */}
                  <Box
                    sx={{
                      display: "flex",
                      width: "100%",
                      height: 15,
                      my: 2,
                      backgroundColor: theme.palette.grey[300],
                      position: "relative",
                    }}
                  >
                    {/* Risk Bar */}
                    <Box
                      sx={{
                        height: "100%",
                        width: `${riskWidthPercent}%`, // Use percentage width
                        backgroundColor: theme.palette.error.light, // Or a custom color e.g., '#b71c1c'
                        transition: "width 0.3s ease-in-out",
                        position: "absolute",
                        right: "50%", // Anchor to the right of the center line
                      }}
                    />
                    {/* Protect Bar */}
                    <Box
                      sx={{
                        height: "100%",
                        width: `${protectWidthPercent}%`, // Use percentage width
                        backgroundColor: theme.palette.success.light, // Or a custom color e.g., '#2e7d32'
                        transition: "width 0.3s ease-in-out",
                        position: "absolute",
                        left: "50%", // Anchor to the left of the center line
                      }}
                    />
                    {/* Center Divider */}
                    <Divider
                      orientation="vertical"
                      flexItem
                      sx={{
                        position: "absolute",
                        left: "50%",
                        height: "100%",
                        bgcolor: "rgba(0, 0, 0, 0.3)",
                      }}
                    />
                  </Box>

                  {/* --- Indicator List --- */}
                  <Box
                    sx={{
                      flexGrow: 1,
                      overflowY: "auto",
                      mt: 2,
                      backgroundColor: theme.palette.grey[100],
                      p: 2,
                      borderRadius: 1,
                    }}
                  >
                    {
                      // Add extra IndicatorRow components for other binary results
                      extraIndicatorRows.map(({ key, label, type, id }) => {
                        if (type === "divider") {
                          return <Divider key={key} sx={{ my: 1 }} />;
                        }
                        return (
                          <IndicatorRow
                            key={key}
                            objectKey={key}
                            id={id ?? ""}
                            label={label ?? ""}
                            value={results[key]}
                          />
                        );
                      })
                    }
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

const extraIndicatorRows = [
  { id: "1", key: "all5", label: "All-5" },
  { type: "divider", key: "divider1" },
  { id: "1a", key: "all5a", label: "At least one vegetable" },
  { id: "1b", key: "all5b", label: "At least one fruit" },
  { id: "1c", key: "all5c", label: "At least one pulse, nut or seed" },
  { id: "1d", key: "all5d", label: "At least one animal-source food" },
  { id: "1e", key: "all5e", label: "At least one starchy staple" },
  { type: "divider", key: "divider2" },
  { id: "2", key: "mddw", label: "MDD-W (Min. Dietary Diversity for Women)" },
  { id: "3", key: "fgds", label: "Food Group Diversity Score (FGDS)" },
  { type: "divider", key: "divider3" },
  { id: "4", key: "zvegfr", label: "Zero Vegetables or Fruit" },
  { id: "4a", key: "vegfr", label: "At least one Vegetable or Fruit" },
  {
    id: "4b",
    key: "dveg_consumption",
    label: "Dark Green Leafy Veg Consumption",
  },
  { id: "4c", key: "oveg_consumption", label: "Other Vegetables Consumption" },
  { id: "4d", key: "ofr_consumption", label: "Other Fruits Consumption" },
  { type: "divider", key: "divider4" },
  { id: "5", key: "pulse_consumption", label: "Pulse Consumption" },
  {
    id: "6",
    key: "nuts_seeds_consumption",
    label: "Nuts or Seeds Consumption",
  },
  { id: "7", key: "whole_grain_consumption", label: "Whole Grain Consumption" },
  { type: "divider", key: "divider5" },
  { id: "8", key: "anml", label: "Meat, Poultry, or Fish Consumption" },
  {
    id: "8a",
    key: "processed_meat_consumption",
    label: "Processed Meat Consumption",
  },
  { id: "8b", key: "umeat", label: "Unprocessed Red Meat Consumption" },
  { id: "8c", key: "dairy", label: "Dairy Consumption" },
  { type: "divider", key: "divider6" },
  // Risk-related Food Group Indicators
  { id: "9", key: "safd", label: "Salty or Fried Snack Consumption" },
  { id: "9a", key: "snf", label: "Salty Snacks, Noodles, or Fast Food" },
  {
    id: "10",
    key: "deep_fried_consumption",
    label: "Deep Fried Food Consumption",
  },
  { id: "11", key: "swtfd", label: "Sweet Foods Consumption" },
  { id: "12", key: "soft_drink_consumption", label: "Soft Drink Consumption" },
  { id: "12a", key: "swtbev", label: "Sweet Beverages Consumption" },
];
