import { useState } from "react";
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
import { MealData } from "../../CameraPage/CreateMealWithoutImage.tsx"; // Added for fetching state

type ProcessingStatus =
  | "idle"
  | "fetching"
  | "processing"
  | "completed"
  | "error";

// --- Firebase Cloud Function Definition (as provided) ---
const callCategorizeIngredients = httpsCallable(
  functions, // Your initialized Firebase Functions instance
  "categorizeIngredients",
);

// --- Flow Runner Function (as provided) ---
const runCategorizeFlow = async (mealInput: MealData) => {
  console.log("Running categorization flow for meal:", mealInput.id);
  try {
    // Simulate network delay (optional)
    // await new Promise(resolve => setTimeout(resolve, 500));

    // Call the actual Cloud Function
    const result = await callCategorizeIngredients({
      mealId: mealInput.id,
    });
    console.log(`Genkit flow result for ${mealInput.id}:`, result.data); // Log result data
    // You might want to handle specific results or errors from the function here
    return { success: true, data: result.data };
  } catch (error) {
    console.error(`Error processing meal ${mealInput.id}:`, error);
    // Rethrow or return an error indicator if needed downstream
    return { success: false, error: error };
  }
};

// --- React Component ---

const CalculateNutritionInfoForAll = () => {
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [totalMeals, setTotalMeals] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processedMeals, setProcessedMeals] = useState<string[]>([]); // Optional: Track processed IDs
  const [failedMeals, setFailedMeals] = useState<string[]>([]); // Optional: Track failed IDs

  const handleStartProcessing = async () => {
    setStatus("fetching");
    setErrorMessage(null);
    setProgress(0);
    setTotalMeals(0);
    setProcessedMeals([]);
    setFailedMeals([]);

    try {
      // 1. Fetch Meals from Firestore
      console.log("Fetching meals from Firestore...");
      const mealsCol = collection(db, "meals"); // Use your actual collection name
      const mealSnapshot = await getDocs(mealsCol);
      const fetchedMeals: MealData[] = mealSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<MealData, "id">), // Spread other data if MealData has more fields
      }));

      if (fetchedMeals.length === 0) {
        console.log("No meals found to process.");
        setStatus("completed"); // Or 'idle' maybe?
        setTotalMeals(0);
        return;
      }

      console.log(`Found ${fetchedMeals.length} meals.`);
      setTotalMeals(fetchedMeals.length);
      setStatus("processing");

      // 2. Process each meal sequentially
      // Using a standard for...of loop for cleaner async/await handling
      let currentProgress = 0;
      const successfulIds: string[] = [];
      const failedIds: string[] = [];

      for (const meal of fetchedMeals) {
        try {
          const result = await runCategorizeFlow(meal);
          if (result.success) {
            successfulIds.push(meal.id);
          } else {
            failedIds.push(meal.id);
            // Optionally set a general error message if one fails,
            // or just track failed IDs
            // setErrorMessage(`Failed to process meal ${meal.id}. Check console.`);
          }
        } catch (error) {
          // This catch block might be redundant if runCategorizeFlow handles its own errors
          console.error(
            `Unhandled exception during flow for meal ${meal.id}:`,
            error,
          );
          failedIds.push(meal.id);
          // setErrorMessage(`Error processing meal ${meal.id}. Check console.`);
        } finally {
          // Update progress regardless of success/failure
          currentProgress++;
          setProgress(currentProgress); // Update state for UI re-render
          setProcessedMeals([...successfulIds]); // Update state
          setFailedMeals([...failedIds]); // Update state
        }
      }

      console.log("Processing finished.");
      setStatus("completed");
      if (failedIds.length > 0) {
        setErrorMessage(
          `${failedIds.length} meal(s) failed to process. Check logs for details.`,
        );
        // Note: Status remains 'completed', but with an error message.
        // You could introduce a 'completed_with_errors' status if needed.
      }
    } catch (error: unknown) {
      console.error("Error during processing:", error);
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

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
        Meal Ingredient Categorization
      </Typography>

      <Box sx={{ my: 2 }}>
        <Button
          variant="contained"
          onClick={handleStartProcessing}
          disabled={status === "fetching" || status === "processing"}
          startIcon={
            status === "fetching" ? (
              <CircularProgress size={20} color="inherit" />
            ) : null
          }
        >
          {status === "processing"
            ? "Processing..."
            : status === "fetching"
              ? "Fetching Meals..."
              : "Start Processing All Meals"}
        </Button>
      </Box>

      {status === "processing" && (
        <Box sx={{ width: "100%", my: 2 }}>
          <Typography variant="body1" gutterBottom>
            Processing meal {progress} of {totalMeals}...
          </Typography>
          <LinearProgress variant="determinate" value={progressPercentage} />
          {failedMeals.length > 0 && (
            <Typography color="error" variant="caption" sx={{ mt: 1 }}>
              Encountered errors on {failedMeals.length} meal(s).
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
          {failedMeals.length} failed out of {totalMeals} total meals.
          {errorMessage && ` (${errorMessage})`}
        </Alert>
      )}

      {status === "error" && errorMessage && (
        <Alert severity="error" sx={{ my: 2 }}>
          An error occurred: {errorMessage}
        </Alert>
      )}

      {/* Optional: Display lists of processed/failed IDs */}
      {/*
             {(processedMeals.length > 0 || failedMeals.length > 0) && (
                 <Box sx={{mt: 2}}>
                    {processedMeals.length > 0 && <Typography variant="body2">Successfully processed: {processedMeals.join(', ')}</Typography>}
                    {failedMeals.length > 0 && <Typography variant="body2" color="error">Failed to process: {failedMeals.join(', ')}</Typography>}
                 </Box>
             )}
             */}
    </Box>
  );
};

export default CalculateNutritionInfoForAll;
