// src/components/MealNutritionVisualizer.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  TextField,
  Tooltip,
  Typography, // Import Typography
} from "@mui/material";
import { doc, setDoc } from "firebase/firestore";
import { db, functions } from "../../firebaseConfig.ts";
import { MealData, NutritionalData } from "../../../functions/src/constants.ts";
import { useSnackbar } from "notistack";
import { debounce } from "../../utils/debounce.ts";
import { httpsCallable } from "firebase/functions";

const callCategorizeIngredients = httpsCallable(
  functions,
  "categorizeIngredients",
);

const runCategorizeFlow = async (mealInput: MealData) => {
  console.log("Simulating Genkit flow execution for meal:", mealInput.id);
  // In a real scenario, you would call your Genkit flow here:
  const result = await callCategorizeIngredients({
    mealId: mealInput.id,
  });
  console.log("Genkit flow result:", result);
};
// --- End Genkit Flow Placeholder ---

// Define the expected keys explicitly for iteration order and validation
const NUTRITIONAL_KEYS: (keyof NutritionalData)[] = [
  "Grains",
  "Vegetables",
  "Fruits",
  "Protein",
  "Dairy",
  "Fats",
  "Sweets",
];

// Helper to create default nutritional data
const createDefaultNutrition = (): NutritionalData => ({
  Grains: 0,
  Vegetables: 0,
  Fruits: 0,
  Protein: 0,
  Dairy: 0,
  Fats: 0,
  Sweets: 0,
});

interface MealNutritionVisualizerProps {
  meal: MealData;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export const MealNutritionVisualizer: React.FC<
  MealNutritionVisualizerProps
> = ({ meal, onSaveSuccess, onSaveError }) => {
  const [isSaving, setIsSaving] = useState(false); // Renamed for clarity
  const [isCategorizing, setIsCategorizing] = useState(false); // State for flow execution
  const [error, setError] = useState<string | null>(null);
  const [nutritionValues, setNutritionValues] = useState<NutritionalData>(
    meal.nutrition || createDefaultNutrition(),
  );

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (meal.nutrition) {
      setNutritionValues(meal.nutrition);
    }
  }, [meal]);

  // Debounced save function for individual field edits
  const debouncedSave = useCallback(
    debounce(async (dataToSave: NutritionalData) => {
      setIsSaving(true); // Use isSaving for manual edits
      setError(null);
      const mealDocRef = doc(db, "meals", meal.id);
      try {
        await setDoc(mealDocRef, { nutrition: dataToSave }, { merge: true });
        // Subtle success indication for auto-save might be preferred over snackbar flood
        // enqueueSnackbar("Change saved.", { variant: "success", autoHideDuration: 1500 });
        console.log("Auto-saved nutrition data for meal ID:", meal.id);
        if (onSaveSuccess) onSaveSuccess();
      } catch (err: any) {
        console.error("Error auto-saving nutrition data:", err);
        setError(err.message || "Failed to save change.");
        enqueueSnackbar("Error saving change.", { variant: "error" });
        if (onSaveError) onSaveError(err);
        // Optionally revert state here if save fails, or let user retry manually
      } finally {
        setIsSaving(false);
      }
    }, 750), // Debounce saves for 750ms
    [meal.id, onSaveSuccess, onSaveError, enqueueSnackbar], // Dependencies for useCallback
  );

  const handleInputChange = (key: keyof NutritionalData, value: string) => {
    // Prevent non-numeric input if desired, or handle NaN
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      // Optionally show an error or ignore the input
      console.warn(`Invalid input for ${key}: ${value}`);
      return; // Or set to 0, or previous value
    }

    setNutritionValues((prevValues) => {
      const newValues = {
        ...prevValues,
        [key]: numericValue,
      };
      // Trigger debounced save
      debouncedSave(newValues);
      return newValues;
    });
  };

  // Function to handle the "Auto-Categorize" button click
  const handleCategorize = async () => {
    setIsCategorizing(true);
    setError(null);

    try {
      console.log("Starting categorization flow for meal:", meal.id);

      await runCategorizeFlow(meal);

      enqueueSnackbar("Ingredients categorized successfully!", {
        variant: "success",
      });
    } catch (err: any) {
      console.error("Error during categorization flow:", err);
      const errorMsg = err.message || "Failed to categorize ingredients.";
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: "error" });
      // Don't call onSaveError here, as it's a flow error, not a save error
      // You might want a specific callback for flow errors if needed.
    } finally {
      setIsCategorizing(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              Nutritional Info for Meal{" "}
              {meal.name ? `"${meal.name}"` : `(ID: ${meal.id})`}
            </Typography>
            <Tooltip title="Calculate nutrition values based on ingredients, this may take up to 30 seconds.">
              <Button
                variant="outlined"
                onClick={handleCategorize}
                disabled={isCategorizing || isSaving} // Disable if categorizing OR saving
                startIcon={
                  isCategorizing ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : null
                }
              >
                {isCategorizing ? "Calculating..." : "Calculate Nutrition"}
              </Button>
            </Tooltip>
          </Box>
        }
      />
      <CardContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <List dense>
          {NUTRITIONAL_KEYS.map((key) => (
            <React.Fragment key={key}>
              <ListItem disablePadding sx={{ py: 0.5 }}>
                {" "}
                {/* Add some padding */}
                <ListItemText
                  primary={key}
                  sx={{ flexShrink: 0, mr: 2, minWidth: "100px" }}
                />{" "}
                {/* Adjust width */}
                <TextField
                  type="number"
                  variant="outlined"
                  size="small"
                  value={nutritionValues[key] ?? ""} // Use ?? '' to avoid controlled/uncontrolled warning if value becomes undefined/null
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  disabled={isCategorizing} // Optionally disable inputs during categorization
                  fullWidth // Let TextField take remaining space
                  inputProps={{
                    // Add step for easier number input
                    step: "0.1",
                    min: "0", // Prevent negative numbers
                  }}
                  sx={{ maxWidth: "150px" }} // Limit max width
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  Grams
                </Typography>
                {/* Show subtle saving indicator next to field */}
                {isSaving && <CircularProgress size={16} sx={{ ml: 1 }} />}
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
        {/* Saving indicator/status could be added at the bottom if preferred */}
        {/* {isSaving && <Typography variant="caption" color="text.secondary" sx={{mt: 1, display: 'block'}}>Saving...</Typography>} */}
      </CardContent>
    </Card>
  );
};
