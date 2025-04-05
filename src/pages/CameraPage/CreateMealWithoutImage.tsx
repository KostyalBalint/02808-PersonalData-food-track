import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  ListItem,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { db } from "../../firebaseConfig"; // Ensure correct path
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import CloseIcon from "@mui/icons-material/Close";
import { FaPlus, FaTrashCan } from "react-icons/fa6";
import { v4 as uuidv4 } from "uuid";
import { units } from "../../../functions/src/constants.ts";
import { useAuth } from "../../context/AuthContext.tsx";
// Make sure MealData type and units are correctly defined and imported
// Example MealData structure inferred from code:
export interface Ingredient {
  id: string;
  amount: number;
  unit: string;
  name: string;
}

export interface MealData {
  id: string; // Will be generated on save
  name: string;
  createdAt: Timestamp | null; // Or FieldValue for serverTimestamp() before saving
  ingredients: Ingredient[];
}

interface CreateMealModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (mealId: string) => void; // Pass the new meal ID back
}

// Default empty meal structure for initialization/reset
const createInitialMealData = (): Omit<MealData, "id"> => ({
  name: "",
  createdAt: null,
  ingredients: [],
});

export const CreateMealWithoutImage: React.FC<CreateMealModalProps> = ({
  open,
  onClose: handleCloseProp,
  onUpload,
}) => {
  // State to hold the meal being created locally
  const [mealData, setMealData] = useState<Omit<MealData, "id">>(
    createInitialMealData(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useAuth();

  // Effect to reset state when modal opens
  useEffect(() => {
    if (open) {
      setMealData(createInitialMealData()); // Reset form on open
      setIsSaving(false);
      setError(null);
    }
  }, [open]);

  // --- Local State Update Handlers ---

  const handleMealNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMealData((prevData) => ({
      ...prevData,
      name: event.target.value,
    }));
  };

  const handleIngredientChange = useCallback(
    (
      ingredientId: string,
      field: keyof Ingredient, // Use keyof for type safety
      value: string | number,
    ) => {
      setMealData((prevData) => {
        const updatedIngredients = prevData.ingredients.map((ingredient) =>
          ingredient.id === ingredientId
            ? { ...ingredient, [field]: value } // Update specific field
            : ingredient,
        );
        return { ...prevData, ingredients: updatedIngredients };
      });
    },
    [], // No dependencies needed as setMealData handles updates correctly
  );

  const handleDeleteIngredient = useCallback((ingredientId: string) => {
    setMealData((prevData) => {
      const updatedIngredients = prevData.ingredients.filter(
        (ingredient) => ingredient.id !== ingredientId,
      );
      return { ...prevData, ingredients: updatedIngredients };
    });
  }, []);

  const handleAddIngredient = useCallback(() => {
    const newIngredient: Ingredient = {
      id: uuidv4(), // Generate unique ID locally
      amount: 1,
      unit: units[0] || "", // Default to first unit or empty string
      name: "", // Start with empty name
    };

    setMealData((prevData) => ({
      ...prevData,
      ingredients: [...prevData.ingredients, newIngredient],
    }));
  }, []);

  // --- Firestore Save Handler ---

  const handleSave = async () => {
    if (!mealData.name.trim()) {
      setError("Meal name cannot be empty.");
      return;
    }
    if (mealData.ingredients.length === 0) {
      setError("Please add at least one ingredient.");
      return;
    }
    // Optional: Add validation for ingredient fields (e.g., name not empty)
    const hasEmptyIngredientName = mealData.ingredients.some(
      (ing) => !ing.name.trim(),
    );
    if (hasEmptyIngredientName) {
      setError("Ingredient names cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const mealToSave = {
      // Type for serverTimestamp
      ...mealData,
      userId: auth.currentUser?.uid,
      withoutImage: true, //Indicate that this meal is created without an image
      createdAt: serverTimestamp(), // Use Firestore server timestamp
    };

    try {
      console.log("Saving meal to Firestore:", mealToSave);
      const docRef = await addDoc(collection(db, "meals"), mealToSave);
      console.log("Document written with ID: ", docRef.id); // Firestore auto-generates its own doc ID
      console.warn(
        "Using Firestore auto-generated ID instead of locally generated UUID for the document path.",
      );
      // We saved our custom `id` field *inside* the document.
      // `docRef.id` is the Firestore document ID.
      // Depending on your needs, you might want to use docRef.id elsewhere,
      // or update the document to store docRef.id if needed.
      // For now, we'll pass back the ID we stored *in* the document.

      onUpload(docRef.id); // Pass back the ID we generated and stored
      handleClose(); // Close modal on success
    } catch (e) {
      console.error("Error adding document: ", e);
      setError("Failed to save meal. Please try again.");
      setIsSaving(false);
    }
    // No finally block needed to set isSaving to false here,
    // because it should remain true until an error or success closure.
  };

  // Custom close handler to reset state if needed (though useEffect covers it)
  const handleClose = () => {
    // Resetting is handled by useEffect on 'open', but explicit reset can be added if desired
    // setMealData(createInitialMealData());
    // setIsSaving(false);
    // setError(null);
    handleCloseProp(); // Call the original onClose prop
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Create New Meal</Typography>{" "}
          {/* Updated Title */}
          <IconButton
            onClick={handleClose}
            aria-label="close"
            disabled={isSaving}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ p: 2 }}>
          {" "}
          {/* Increased spacing */}
          {/* Meal Name Input */}
          <TextField
            label="Meal Name"
            value={mealData.name}
            onChange={handleMealNameChange}
            fullWidth
            size="small"
            variant="outlined"
            required
            disabled={isSaving}
            error={!!error && !mealData.name.trim()} // Show error if relevant and name is empty
            helperText={!!error && !mealData.name.trim() ? error : ""}
          />
          {/* Ingredients Section */}
          <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
            {" "}
            {/* Added border */}
            <Typography variant="h6" mb={2}>
              {" "}
              {/* Changed from h4 */}
              Ingredients:
            </Typography>
            <Stack gap={2}>
              {mealData.ingredients.map((ingredient) => (
                <ListItem key={ingredient.id} disableGutters disablePadding>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ width: "100%" }}
                    alignItems="center"
                  >
                    {" "}
                    {/* Aligned items center */}
                    <TextField
                      value={ingredient.amount}
                      size="small"
                      label="Amount"
                      type="number"
                      inputProps={{ min: 0, step: "any" }} // Allow decimals, prevent negative
                      onChange={(e) =>
                        handleIngredientChange(
                          ingredient.id,
                          "amount",
                          // Handle potential NaN or empty string
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      sx={{ width: "80px" }}
                      disabled={isSaving}
                    />
                    <FormControl sx={{ width: "100px" }} size="small">
                      <InputLabel id={`unit-selector-label-${ingredient.id}`}>
                        Unit
                      </InputLabel>
                      <Select
                        labelId={`unit-selector-label-${ingredient.id}`}
                        id={`unit-selector-${ingredient.id}`}
                        value={ingredient.unit}
                        onChange={(e) =>
                          handleIngredientChange(
                            ingredient.id,
                            "unit",
                            e.target.value as string,
                          )
                        }
                        label="Unit"
                        disabled={isSaving}
                      >
                        {units.map((unit) => (
                          <MenuItem key={unit} value={unit}>
                            {unit}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      value={ingredient.name}
                      size="small"
                      label="Name"
                      sx={{ flexGrow: 1 }}
                      onChange={(e) =>
                        handleIngredientChange(
                          ingredient.id,
                          "name",
                          e.target.value,
                        )
                      }
                      required // Visually indicate required
                      disabled={isSaving}
                      error={!!error && !ingredient.name.trim()} // Show error if relevant and name is empty
                    />
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDeleteIngredient(ingredient.id)}
                      disabled={isSaving}
                      aria-label={`Delete ingredient ${ingredient.name || ""}`}
                    >
                      <FaTrashCan />
                    </IconButton>
                  </Stack>
                </ListItem>
              ))}
              {/* Add Ingredient Button */}
              <ListItem disableGutters disablePadding sx={{ pt: 1 }}>
                {" "}
                {/* Added padding top */}
                <Button
                  startIcon={<FaPlus />}
                  variant="outlined" // Changed variant for less emphasis
                  onClick={handleAddIngredient}
                  disabled={isSaving}
                  size="small"
                >
                  Add Ingredient
                </Button>
              </ListItem>
            </Stack>
          </Paper>
          {/* Error Display Area */}
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      {/* Dialog Actions for Save/Cancel */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {" "}
        {/* Added padding */}
        <Button onClick={handleClose} disabled={isSaving} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={
            isSaving || !mealData.name || mealData.ingredients.length === 0
          } // Disable if saving or invalid
        >
          {isSaving ? "Saving..." : "Save Meal"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
