import {
  Alert,
  Button,
  Card,
  CardHeader,
  CardMedia,
  Container,
  FormControl,
  Grid2,
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
import { useNavigate, useParams } from "react-router-dom";
import { MealData, units } from "../constants.ts";
import { FaPlus, FaTrashCan } from "react-icons/fa6";
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { ConfirmationModal } from "../components/ConfirmationModal.tsx";
import { deleteObject, getStorage, ref } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export const MealPage = () => {
  const { id } = useParams();

  //Fetch meal data from Firestore
  const [meal, setMeal] = useState<MealData | null>(null);

  const navigate = useNavigate();

  const [isModalOpen, setModalOpen] = useState(false);
  const storage = getStorage();

  useEffect(() => {
    if (!id) return;

    const q = query(collection(db, "meals"), where(documentId(), "==", id));
    // Set up a real-time listener using onSnapshot
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userMeals = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MealData[];

      setMeal(userMeals[0]);
    });

    // Return a cleanup function to unsubscribe from the listener
    return () => unsubscribe();
  }, [id]);

  const handleDeleteClick = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleModalConfirm = useCallback(async () => {
    if (meal) {
      try {
        // Delete document from Firestore
        const mealDocRef = doc(db, "meals", meal.id);
        await deleteDoc(mealDocRef);
        console.log("Meal document deleted");

        // Delete image from Firebase Storage
        const imageRef = ref(storage, meal.imageUrl);
        await deleteObject(imageRef);
        console.log("Image deleted from storage");

        // Navigate to another route after deletion
        navigate("/meals"); // Adjust this route according to your app's routing
      } catch (error) {
        console.error("Error deleting meal:", error);
      }
    }
    setModalOpen(false);
  }, [meal, navigate, storage]);

  // Handle ingredient changes
  const handleIngredientChange = useCallback(
    async (
      ingredientId: string,
      field: "amount" | "unit" | "name",
      value: string | number,
    ) => {
      if (!meal || !id) return;

      try {
        // Update locally first for immediate UI response
        const updatedIngredients = meal.ingredients?.map((ingredient) =>
          ingredient.id === ingredientId
            ? { ...ingredient, [field]: value }
            : ingredient,
        );

        setMeal({
          ...meal,
          ingredients: updatedIngredients,
        });

        // Update in Firestore
        const mealDocRef = doc(db, "meals", id);
        await updateDoc(mealDocRef, {
          ingredients: updatedIngredients,
        });
      } catch (error) {
        console.error("Error updating ingredient:", error);
        // Optionally revert the local state if the update fails
      }
    },
    [meal, id],
  );

  // Delete an ingredient
  const handleDeleteIngredient = useCallback(
    async (ingredientId: string) => {
      if (!meal || !id) return;

      try {
        const updatedIngredients = meal.ingredients?.filter(
          (ingredient) => ingredient.id !== ingredientId,
        );

        // Update in Firestore
        const mealDocRef = doc(db, "meals", id);
        await updateDoc(mealDocRef, {
          ingredients: updatedIngredients,
        });
      } catch (error) {
        console.error("Error deleting ingredient:", error);
      }
    },
    [meal, id],
  );

  // Add a new ingredient
  const handleAddIngredient = useCallback(async () => {
    if (!meal || !id) return;

    const newIngredient = {
      id: uuidv4(),
      amount: 1,
      unit: units[0],
      name: "New Ingredient",
    };

    try {
      const updatedIngredients = meal.ingredients
        ? [...meal.ingredients, newIngredient]
        : [newIngredient];

      // Update in Firestore
      const mealDocRef = doc(db, "meals", id);
      await updateDoc(mealDocRef, {
        ingredients: updatedIngredients,
      });
    } catch (error) {
      console.error("Error adding ingredient:", error);
    }
  }, [meal, id]);

  return (
    <Container sx={{ mt: 2 }}>
      <Grid2 container spacing={2}>
        {meal?.errorMessage && (
          <Alert severity="error">{meal?.errorMessage}</Alert>
        )}
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Container maxWidth={"sm"} sx={{ px: 0 }}>
            <Card>
              {meal && (
                <CardHeader title={meal?.name} sx={{ textAlign: "center" }} />
              )}
              <CardMedia
                component="img"
                image={meal?.imageUrl}
                alt="Uploaded images"
              />
            </Card>
          </Container>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4" mb={2}>
              Ingredients:
            </Typography>
            <Stack gap={2}>
              {meal?.ingredients?.map((ingredient) => (
                <div key={ingredient.id}>
                  <ListItem disableGutters disablePadding>
                    <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                      <TextField
                        value={ingredient.amount}
                        size="small"
                        label="Amount"
                        type="number"
                        onChange={(e) =>
                          handleIngredientChange(
                            ingredient.id,
                            "amount",
                            Number(e.target.value),
                          )
                        }
                        sx={{ width: "80px" }} // Narrower amount field
                      />
                      <FormControl sx={{ width: "100px" }}>
                        {" "}
                        {/* Narrower unit field */}
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
                              e.target.value,
                            )
                          }
                          size="small"
                          label="Unit"
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
                        sx={{ flexGrow: 1 }} // Takes up all remaining space
                        onChange={(e) =>
                          handleIngredientChange(
                            ingredient.id,
                            "name",
                            e.target.value,
                          )
                        }
                      />
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDeleteIngredient(ingredient.id)}
                      >
                        <FaTrashCan />
                      </IconButton>
                    </Stack>
                  </ListItem>
                </div>
              ))}
              <ListItem disableGutters disablePadding>
                <Button
                  startIcon={<FaPlus />}
                  variant="contained"
                  onClick={handleAddIngredient}
                >
                  Add new ingredient
                </Button>
              </ListItem>
            </Stack>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteClick}
            >
              Delete
            </Button>
          </Paper>
        </Grid2>
        <ConfirmationModal
          open={isModalOpen}
          onClose={handleModalClose}
          onConfirm={handleModalConfirm}
          title="Delete Meal"
          description="Are you sure you want to delete this meal? This action cannot be undone."
        />
      </Grid2>
    </Container>
  );
};
