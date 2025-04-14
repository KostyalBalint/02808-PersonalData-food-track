import { useState, useCallback } from "react"; // Added useCallback
import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// --- MUI Imports ---
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { db, functions } from "../../../firebaseConfig.ts";
import { MealData } from "../../CameraPage/CreateMealWithoutImage.tsx";

type ProcessingStatus =
  | "idle"
  | "fetching"
  | "processing"
  | "completed"
  | "error";

// --- Constants ---
const MAX_CONCURRENCY = 5; // Max jobs running at the same time
const MAX_RETRIES = 3; // Max retries per job
const RETRY_DELAY_MS = 1000; // Delay between retries

// --- Firebase Cloud Function Definition ---
const callCategorizeIngredients = httpsCallable(
  functions,
  "categorizeIngredients",
);

// --- Flow Runner Function (with Retries) ---
const runCategorizeFlow = async (
  mealInput: MealData,
  maxRetries: number = MAX_RETRIES,
) => {
  const mealId = mealInput.id; // Store for consistent logging
  console.log(`[${mealId}] Starting categorization flow.`);
  let attempts = 0;
  let lastError: any = null;

  while (attempts < maxRetries) {
    attempts++;
    try {
      console.log(`[${mealId}] Attempt ${attempts}/${maxRetries}...`);
      // Simulate network delay (optional)
      // await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500)); // Random delay for testing

      const result = await callCategorizeIngredients({ mealId });
      console.log(
        `[${mealId}] Attempt ${attempts} successful. Result:`,
        result.data,
      );
      return { success: true, data: result.data, mealId };
    } catch (error) {
      lastError = error;
      console.error(
        `[${mealId}] Attempt ${attempts}/${maxRetries} failed:`,
        error,
      );

      if (attempts < maxRetries) {
        console.log(`[${mealId}] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  console.error(`[${mealId}] All ${maxRetries} attempts failed.`);
  return { success: false, error: lastError, mealId };
};

// --- React Component (Modified for Parallelism) ---
const CalculateNutritionInfoForAll = () => {
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [totalMeals, setTotalMeals] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processedMeals, setProcessedMeals] = useState<string[]>([]);
  const [failedMeals, setFailedMeals] = useState<string[]>([]);

  // Using useCallback to potentially optimize if passed as prop, though not strictly needed here
  const handleStartProcessing = useCallback(async () => {
    setStatus("fetching");
    setErrorMessage(null);
    setProgress(0);
    setTotalMeals(0);
    setProcessedMeals([]);
    setFailedMeals([]);

    try {
      // 1. Fetch Meals
      console.log("Fetching meals from Firestore...");
      const mealsCol = collection(db, "meals");
      const mealSnapshot = await getDocs(mealsCol);
      const fetchedMeals: MealData[] = mealSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<MealData, "id">),
      }));

      if (fetchedMeals.length === 0) {
        console.log("No meals found.");
        setStatus("completed");
        setTotalMeals(0);
        return;
      }

      console.log(`Found ${fetchedMeals.length} meals.`);
      setTotalMeals(fetchedMeals.length);
      setStatus("processing");

      // 2. Process Meals in Parallel with Concurrency Limit
      const mealQueue = [...fetchedMeals]; // Create a mutable copy for the queue
      let runningTasks = 0;
      let completedCount = 0;
      const results: { success: boolean; mealId: string }[] = []; // Store results

      // This promise resolves when all meals are processed (or failed after retries)
      const allProcessingDone = new Promise<void>((resolve) => {
        const processMeal = async (meal: MealData) => {
          try {
            const result = await runCategorizeFlow(meal, MAX_RETRIES);
            results.push({ success: result.success, mealId: result.mealId });

            // Use functional updates for state safety with concurrent updates
            if (result.success) {
              setProcessedMeals((prev) => [...prev, result.mealId]);
            } else {
              setFailedMeals((prev) => [...prev, result.mealId]);
            }
          } catch (error) {
            // Should not happen if runCategorizeFlow always returns object, but good practice
            console.error(
              `[${meal.id}] Unexpected error in processMeal wrapper:`,
              error,
            );
            results.push({ success: false, mealId: meal.id });
            setFailedMeals((prev) => [...prev, meal.id]);
          } finally {
            // Use functional update for progress
            setProgress((prev) => prev + 1);
            completedCount++;
            runningTasks--;
            processNext(); // Try to start the next task from the queue
          }
        };

        const processNext = () => {
          // If all meals are processed or currently running, check for completion
          if (completedCount === fetchedMeals.length) {
            console.log("All meal processing attempts finished.");
            resolve(); // All tasks are done
            return;
          }

          // Start new tasks if concurrency limit allows and queue has items
          while (runningTasks < MAX_CONCURRENCY && mealQueue.length > 0) {
            const nextMeal = mealQueue.shift(); // Get next meal from queue
            if (nextMeal) {
              runningTasks++;
              console.log(
                `[${nextMeal.id}] Starting processing. ${runningTasks} tasks running. Queue size: ${mealQueue.length}`,
              );
              processMeal(nextMeal); // Start processing async, DO NOT await here
            }
          }
          // If no tasks are running and the queue isn't empty (shouldn't happen with above logic, but safe check)
          // or if queue is empty but not all are completed yet, we just wait for running tasks to finish
          // console.log("Concurrency limit reached or queue empty, waiting for running tasks.");
        };

        // Start the initial batch of tasks
        processNext();
      });

      // Wait for the master promise to resolve
      await allProcessingDone;

      console.log("Parallel processing finished.");
      setStatus("completed");

      // Check final results after all tasks are done
      const finalFailedCount = results.filter((r) => !r.success).length;
      if (finalFailedCount > 0) {
        setErrorMessage(
          `${finalFailedCount} meal(s) failed to process after retries. Check logs.`,
        );
      }
    } catch (error: unknown) {
      console.error("Error during processing setup or fetch:", error);
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, []); // Empty dependency array for useCallback, as it doesn't depend on props/state outside its scope

  const progressPercentage = totalMeals > 0 ? (progress / totalMeals) * 100 : 0;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 600,
        margin: "auto",
        padding: 2,
        border: "1px solid #ccc",
        borderRadius: 1,
      }}
    >
      <Typography variant="h5" gutterBottom>
        Meal Ingredient Categorization (Parallel)
      </Typography>

      <Box sx={{ my: 2 }}>
        <Button
          variant="contained"
          onClick={handleStartProcessing}
          disabled={status === "fetching" || status === "processing"}
          startIcon={
            status === "fetching" || status === "processing" ? ( // Show spinner during both states
              <CircularProgress size={20} color="inherit" />
            ) : null
          }
        >
          {status === "processing"
            ? `Processing (${progress}/${totalMeals})...` // Show progress on button
            : status === "fetching"
              ? "Fetching Meals..."
              : "Start Processing All Meals"}
        </Button>
      </Box>

      {status === "processing" && (
        <Box sx={{ width: "100%", my: 2 }}>
          <Typography variant="body1" gutterBottom>
            Processing meal {progress} of {totalMeals}... (Max {MAX_CONCURRENCY}{" "}
            parallel)
          </Typography>
          <LinearProgress variant="determinate" value={progressPercentage} />
          {/* Displaying failed count live might be slightly delayed due to async state updates */}
          {failedMeals.length > 0 && (
            <Typography color="error" variant="caption" sx={{ mt: 1 }}>
              Failed so far: {failedMeals.length} meal(s).
            </Typography>
          )}
        </Box>
      )}

      {status === "completed" && (
        <Alert
          severity={failedMeals.length > 0 ? "warning" : "success"}
          sx={{ my: 2 }}
        >
          Processing completed. {processedMeals.length} successful,{" "}
          {failedMeals.length} failed (after retries) out of {totalMeals} total.
          {errorMessage && ` (${errorMessage})`}
        </Alert>
      )}

      {status === "error" && errorMessage && (
        <Alert severity="error" sx={{ my: 2 }}>
          An error occurred: {errorMessage}
        </Alert>
      )}

      {/* Keep displaying final lists after completion */}
      {(status === "completed" || status === "error") &&
        (processedMeals.length > 0 || failedMeals.length > 0) && (
          <Box sx={{ mt: 2, maxHeight: 150, overflowY: "auto" }}>
            {processedMeals.length > 0 && (
              <Typography variant="body2">
                Successfully processed ({processedMeals.length}):{" "}
                {processedMeals.join(", ")}
              </Typography>
            )}
            {failedMeals.length > 0 && (
              <Typography
                variant="body2"
                color="error"
                sx={{ mt: processedMeals.length > 0 ? 1 : 0 }}
              >
                Failed to process ({failedMeals.length}):{" "}
                {failedMeals.join(", ")}
              </Typography>
            )}
          </Box>
        )}
    </Box>
  );
};

export default CalculateNutritionInfoForAll;
