import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Chip,
  IconButton,
  List,
  ListItem,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { MealData } from "../../../functions/src/constants.ts";
import { format } from "date-fns";
import React, { useCallback, useState } from "react";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { ConfirmationModal } from "../../components/ConfirmationModal.tsx";
import { deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig.ts";
import { deleteObject, getStorage, ref } from "firebase/storage";
import { useSnackbar } from "notistack";
import { MealNameChangingModal } from "../../components/MealNameChangingModal.tsx";
import { DatePickerModal } from "../../components/DatePickerModal.tsx";
import dayjs, { Dayjs } from "dayjs";

export const MealCard = (props: { meal: MealData }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const storage = getStorage();
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  const handleRename = (name: string) => {
    setAnchorEl(null);
    setEditModalOpen(false);
    // your edit logic here
    const mealDocRef = doc(db, "meals", props.meal.id);
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
    // your edit logic here
    const mealDocRef = doc(db, "meals", props.meal.id);
    updateDoc(mealDocRef, { createdAt: Timestamp.fromDate(date.toDate()) })
      .then(() => {
        enqueueSnackbar("Meal updated successfully", { variant: "success" });
      })
      .catch(() => {
        enqueueSnackbar("Error while updating meals", { variant: "error" });
      });
  };
  const handleModalClose = () => {
    setModalOpen(false);
  };

  const handleMealChangingModalClose = () => {
    setEditModalOpen(false);
  };

  const handleDateModalClose = () => {
    console.log("Date modal closed");
    setIsDateModalOpen(false);
  };

  const handleDateModalOpen = () => {
    setIsDateModalOpen(true);
  };

  const handleModalConfirm = useCallback(async () => {
    if (props.meal) {
      try {
        // Delete document from Firestore
        const mealDocRef = doc(db, "meals", props.meal.id);
        await deleteDoc(mealDocRef);
        console.log("Meal document deleted");

        // Delete image from Firebase Storage
        const imageRef = ref(storage, props.meal.imageUrl);
        await deleteObject(imageRef);
        console.log("Image deleted from storage");
      } catch (error) {
        console.error("Error deleting meal:", error);
      }
    }
    setModalOpen(false);
  }, [props.meal, storage]);

  const handleDeleteClick = () => {
    setModalOpen(true);
  };

  return (
    <>
      <a href={`/meal/${props.meal.id}`} style={{ textDecoration: "none" }}>
        <Card sx={{ cursor: "pointer" }}>
          <CardHeader
            title={props.meal.name}
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
                  <MenuItem onClick={handleDateModalOpen}>Change time</MenuItem>
                  <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
                </Menu>
              </>
            }
          />
          <Box sx={{ position: "relative" }}>
            <CardMedia
              component="img"
              image={props.meal.imageUrl}
              alt="Uploaded image"
              loading="lazy"
              sx={{ aspectRatio: 1 }}
            />
            <Chip
              label={format(props.meal.createdAt.toDate(), "HH:mm")}
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
          </Box>
          <CardContent>
            <Typography variant="h6">Ingredients:</Typography>
            <List>
              {!props.meal.ingredients && (
                <Typography>No ingredients</Typography>
              )}
              {props.meal.ingredients?.map((ingredient) => (
                <ListItem
                  key={ingredient.name}
                  disableGutters
                  disablePadding
                  sx={{ ml: 2 }}
                >
                  <Typography variant="body1">
                    - {ingredient.amount} {ingredient.unit} {ingredient.name}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </a>
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
        originalMealName={props.meal.name}
      />
      <DatePickerModal
        originalDate={dayjs(props.meal.createdAt.toDate(), "HH:mm")}
        open={isDateModalOpen}
        onClose={handleDateModalClose}
        onConfirm={(date: Dayjs) => {
          handleDateChange(date);
          //Save the new name to the database
        }}
      />
    </>
  );
};
