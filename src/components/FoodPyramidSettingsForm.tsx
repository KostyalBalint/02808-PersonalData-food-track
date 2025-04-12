import { useCallback, useEffect, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AimedFoodGroup,
  UserNutritionSettings,
  UserProfile,
} from "../context/AuthContext.tsx";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig.ts";
import { useSnackbar } from "notistack";

export const FoodPyramidSettingsForm = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchUsers = useCallback(async () => {
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef);
      const querySnapshot = await getDocs(q);

      const usersData = querySnapshot.docs.map(
        (doc) =>
          ({
            uid: doc.id,
            email: doc.data().email || "N/A",
            displayName: doc.data().displayName || "N/A",
            role: doc.data().role || "SUBJECT",
          }) as UserProfile,
      );

      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      enqueueSnackbar("Error fetching users", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [enqueueSnackbar]); // Add enqueueSnackbar dependency

  const [aimedAmounts, setAimedAmounts] = useState<UserNutritionSettings>({
    protein: {},
    carbohydrates: {},
    fruits: {},
    vegetables: {},
    fats: {},
    dairy: {},
    sweets: {},
  });

  useEffect(() => {
    if (selectedUserId) {
      const userDocRef = doc(db, "users", selectedUserId);
      updateDoc(userDocRef, {
        nutritionSettings: aimedAmounts,
      });
    }
  }, [aimedAmounts]);

  // Function to handle changes in the aimed amount fields
  const handleAimAmountChange = (
    value: number,
    foodGroup: keyof UserNutritionSettings,
    type: keyof AimedFoodGroup,
  ) => {
    setAimedAmounts((prevAmounts) => {
      const updatedAmounts = {
        ...prevAmounts,
        [foodGroup]: {
          ...prevAmounts[foodGroup],
          [type]: Number(value),
        },
      };
      console.log(
        `Updated Aimed Amounts for User ${selectedUserId}:`,
        updatedAmounts,
      );
      return updatedAmounts;
    });
  };

  // Simulate fetching user data based on the selected user (replace with your API call)
  useEffect(() => {
    if (selectedUserId) {
      const fetchUserData = async () => {
        // In a real application, you would fetch the user's food pyramid ranges here
        // based on the selectedUserId.

        const userQuery = doc(db, "users", selectedUserId);
        const userRef = await getDoc(userQuery);
        const user = userRef.data() as UserProfile;

        if (!user) {
          enqueueSnackbar("User not found", { variant: "error" });
          return;
        }

        if (user.nutritionSettings) {
          setAimedAmounts(user.nutritionSettings); // Initialize the form with the fetched data
        } else {
          setAimedAmounts({
            protein: { min: 0, max: 0 },
            carbohydrates: { min: 0, max: 0 },
            fruits: { min: 0, max: 0 },
            vegetables: { min: 0, max: 0 },
            fats: { min: 0, max: 0 },
            dairy: { min: 0, max: 0 },
            sweets: { min: 0, max: 0 },
          });
        }
      };

      fetchUserData();
    } else {
      setAimedAmounts({
        protein: {},
        carbohydrates: {},
        fruits: {},
        vegetables: {},
        fats: {},
        dairy: {},
        sweets: {},
      });
    }
  }, [selectedUserId]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4" component="h2">
        Set Aimed Food Amounts for User:{" "}
        {users.find((user) => user.uid === selectedUserId)?.displayName}
      </Typography>

      {/* User Selector */}
      <FormControl fullWidth>
        <InputLabel id="user-select-label">Select User</InputLabel>
        <Select
          labelId="user-select-label"
          id="user-select"
          size="small"
          value={selectedUserId}
          onChange={(event) => setSelectedUserId(event.target.value)}
        >
          {users.map((user) => (
            <MenuItem key={user.uid} value={user.uid}>
              {user.displayName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedUserId && (
        <>
          <Box>
            <Typography variant="subtitle1">Protein (g)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Min"
                type="number"
                size="small"
                value={aimedAmounts.protein?.min ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(
                    Number(e.target.value),
                    "protein",
                    "min",
                  )
                }
              />
              <TextField
                label="Max"
                type="number"
                size="small"
                value={aimedAmounts.protein?.max ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(
                    Number(e.target.value),
                    "protein",
                    "max",
                  )
                }
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1">Carbohydrates (g)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Min"
                type="number"
                size="small"
                value={aimedAmounts.carbohydrates?.min ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(
                    Number(e.target.value),
                    "carbohydrates",
                    "min",
                  )
                }
              />
              <TextField
                label="Max"
                type="number"
                size="small"
                value={aimedAmounts.carbohydrates?.max ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(
                    Number(e.target.value),
                    "carbohydrates",
                    "max",
                  )
                }
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1">Fruits (servings)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Min"
                type="number"
                size="small"
                value={aimedAmounts.fruits?.min ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(Number(e.target.value), "fruits", "min")
                }
              />
              <TextField
                label="Max"
                type="number"
                size="small"
                value={aimedAmounts.fruits?.max ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(Number(e.target.value), "fruits", "max")
                }
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1">Dairy </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Min"
                type="number"
                size="small"
                value={aimedAmounts.dairy?.min ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(Number(e.target.value), "dairy", "min")
                }
              />
              <TextField
                label="Max"
                type="number"
                size="small"
                value={aimedAmounts.dairy?.max ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(Number(e.target.value), "dairy", "max")
                }
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1">Vegetables (g)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Min"
                type="number"
                size="small"
                value={aimedAmounts.vegetables?.min ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(
                    Number(e.target.value),
                    "vegetables",
                    "min",
                  )
                }
              />
              <TextField
                label="Max"
                type="number"
                size="small"
                value={aimedAmounts.vegetables?.max ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(
                    Number(e.target.value),
                    "vegetables",
                    "max",
                  )
                }
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1">Fats (g)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Min"
                type="number"
                size="small"
                value={aimedAmounts.fats?.min ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(Number(e.target.value), "fats", "min")
                }
              />
              <TextField
                label="Max"
                type="number"
                size="small"
                value={aimedAmounts.fats?.max ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(Number(e.target.value), "fats", "max")
                }
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1">Sweets (g)</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Min"
                type="number"
                size="small"
                inputProps={{
                  // Add step for easier number input
                  min: "-1", // Prevent negative numbers
                }}
                value={aimedAmounts.sweets?.min ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(Number(e.target.value), "sweets", "min")
                }
              />
              <TextField
                label="Max"
                type="number"
                size="small"
                value={aimedAmounts.sweets?.max ?? ""}
                onChange={(e) =>
                  handleAimAmountChange(Number(e.target.value), "sweets", "max")
                }
              />
            </Stack>
          </Box>

          {/* Add a Save Button here to persist the aimedAmounts for the selectedUser */}
          {/* <Button variant="contained" color="primary" onClick={() => handleSave(selectedUserId, aimedAmounts)}>
            Save
          </Button> */}
        </>
      )}
    </Stack>
  );
};
