import {
  Button,
  Card,
  CardHeader,
  CardMedia,
  Container,
  Divider,
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
  getDocs,
  query,
  where,
  documentId,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { ConfirmationModal } from "../components/ConfirmationModal.tsx";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { deleteDoc, doc } from "firebase/firestore";

export const MealPage = () => {
  const { id } = useParams();

  //Fetch meal data from Firestore
  const [meal, setMeal] = useState<MealData | null>(null);

  const navigate = useNavigate();

  const [isModalOpen, setModalOpen] = useState(false);
  const storage = getStorage();

  useEffect(() => {
    const q = query(collection(db, "meals"), where(documentId(), "==", id));
    getDocs(q).then((querySnapshot) => {
      const userMeals = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MealData[];

      console.log(querySnapshot);

      setMeal(userMeals[0]);
    });
  }, []);

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
  return (
    <Container sx={{ mt: 2 }}>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Container maxWidth={"sm"}>
            <Card>
              {meal && (
                <CardHeader title={meal?.name} sx={{ textAlign: "center" }} />
              )}
              <CardMedia
                component="img"
                image={meal?.imageUrl}
                alt="Uploaded image"
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
                <>
                  <ListItem key={ingredient.id} disableGutters disablePadding>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        defaultValue={ingredient.amount}
                        size="small"
                        label="Amount"
                      />
                      <FormControl sx={{ m: 1, minWidth: 120 }}>
                        <InputLabel id="unit-selector-label">Unit</InputLabel>
                        <Select
                          labelId="unit-selector-label"
                          id="unit-selector"
                          value={ingredient.unit}
                          //onChange={handleChange}
                          //input={<TextField size="small" label="Unit" />}
                          size="small"
                          label="Unit"
                          //MenuProps={MenuProps}
                        >
                          {units.map((unit) => (
                            <MenuItem key={unit} value={unit}>
                              {unit}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        defaultValue={ingredient.name}
                        size="small"
                        label="Name"
                      />
                      <IconButton color="error" size="small">
                        <FaTrashCan />
                      </IconButton>
                    </Stack>
                  </ListItem>
                  <Divider />
                </>
              ))}
              <ListItem disableGutters disablePadding>
                <Button startIcon={<FaPlus />} variant="contained">
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
