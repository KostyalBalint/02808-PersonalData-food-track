import {
  Alert,
  Box,
  Button,
  Card,
  CardHeader,
  CardMedia,
  Chip,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  ListItem,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { MealData, units } from "../../functions/src/constants.ts";
import { FaPlus, FaTrashCan } from "react-icons/fa6";
import React, { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { ConfirmationModal } from "../components/ConfirmationModal.tsx";
import { deleteObject, getStorage, ref } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { DqqQuestionerForm } from "../components/DqqCalculator/DqqQuestionerForm.tsx";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useSnackbar } from "notistack";
import dayjs, { Dayjs } from "dayjs";
import { MealNameChangingModal } from "../components/MealNameChangingModal.tsx";
import { DatePickerModal } from "../components/DatePickerModal.tsx";
import { format } from "date-fns";

export const MealPage = () => {
  const { id } = useParams();

  //Fetch meal data from Firestore
  const [meal, setMeal] = useState<MealData | null>(null);

  const navigate = useNavigate();

  const [isModalOpen, setModalOpen] = useState(false);
  const storage = getStorage();

  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleRename = (name: string) => {
    setAnchorEl(null);
    setEditModalOpen(false);
    if (!meal || !id) return;
    // your edit logic here
    const mealDocRef = doc(db, "meals", meal.id);
    updateDoc(mealDocRef, { name: name })
      .then(() => {
        enqueueSnackbar("Meal updated successfully", { variant: "success" });
      })
      .catch(() => {
        enqueueSnackbar("Error while updating meals", { variant: "error" });
      });
  };

  const handleDateChange = (date: Dayjs) => {
    setAnchorEl(null);
    setEditModalOpen(false);
    if (!meal || !id) return;
    // your edit logic here
    const mealDocRef = doc(db, "meals", meal.id);
    updateDoc(mealDocRef, { createdAt: Timestamp.fromDate(date.toDate()) })
      .then(() => {
        enqueueSnackbar("Meal updated successfully", { variant: "success" });
      })
      .catch(() => {
        enqueueSnackbar("Error while updating meals", { variant: "error" });
      });
  };

  const handleMealChangingModalClose = () => {
    setEditModalOpen(false);
    setAnchorEl(null);
  };

  const handleDateModalClose = () => {
    console.log("Date modal closed");
    setIsDateModalOpen(false);
  };

  const handleDateModalOpen = () => {
    setIsDateModalOpen(true);
  };

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
      console.log("Fetched meal data:", userMeals[0]);
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
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          {meal?.errorMessage && (
            <Alert severity="error">{meal?.errorMessage}</Alert>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Container maxWidth={"sm"} disableGutters>
            <Card sx={{ m: 0 }}>
              {meal && (
                <CardHeader
                  title={meal?.name}
                  sx={{ textAlign: "center" }}
                  action={
                    <>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation(); // Prevents navigation
                          setAnchorEl(e.currentTarget);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                        onClick={(e) => e.stopPropagation()} // Prevent menu clicks from triggering navigation
                      >
                        <MenuItem onClick={() => setEditModalOpen(true)}>
                          Change meal name
                        </MenuItem>
                        <MenuItem onClick={handleDateModalOpen}>
                          Change time
                        </MenuItem>
                        <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
                      </Menu>
                    </>
                  }
                />
              )}
              <Box sx={{ position: "relative" }}>
                <CardMedia
                  component="img"
                  image={meal?.imageUrl}
                  alt="Uploaded images"
                  sx={{ aspectRatio: "3/4" }}
                />
                {meal && (
                  <Chip
                    label={format(meal.createdAt.toDate(), "HH:mm")}
                    size="small"
                    color="primary"
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      zIndex: 1,
                      m: 1,
                    }}
                  />
                )}
              </Box>
            </Card>
          </Container>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
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
        </Grid>
        <Grid size={{ xs: 12 }}>
          {meal && <DqqQuestionerForm mealId={meal.id} />}
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" gap={2}>
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteClick}
              >
                Delete
              </Button>
            </Stack>
          </Paper>
        </Grid>
        <ConfirmationModal
          open={isModalOpen}
          onClose={handleModalClose}
          onConfirm={handleModalConfirm}
          title="Delete Meal"
          description="Are you sure you want to delete this meal? This action cannot be undone."
        />
        <MealNameChangingModal
          open={isEditModalOpen}
          onClose={handleMealChangingModalClose}
          onConfirm={(name) => {
            handleRename(name);
            //Save the new name to the database
          }}
          title={"Edit meal's name"}
          originalMealName={meal != null ? meal.name : ""}
        />
        <DatePickerModal
          originalDate={dayjs(meal && meal.createdAt.toDate(), "HH:mm")}
          open={isDateModalOpen}
          onClose={handleDateModalClose}
          onConfirm={(date: Dayjs) => {
            handleDateChange(date);
            //Save the new name to the database
          }}
        />
      </Grid>
    </Container>
  );
};
