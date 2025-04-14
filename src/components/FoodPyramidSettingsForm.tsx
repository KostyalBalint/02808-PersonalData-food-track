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
    vegetables: {},
    carbohydrates: {},
    dairy: {},
    protein: {},
    fats: {},
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
            vegetables: { min: 0, max: 0 },
            carbohydrates: { min: 0, max: 0 },
            dairy: { min: 0, max: 0 },
            protein: { min: 0, max: 0 },
            fats: { min: 0, max: 0 },
            sweets: { min: 0, max: 0 },
          });
        }
      };

      fetchUserData();
    } else {
      setAimedAmounts({
        vegetables: {},
        carbohydrates: {},
        dairy: {},
        protein: {},
        fats: {},
        sweets: {},
      });
    }
  }, [selectedUserId]);

  const inputFiels: {
    [key in keyof UserNutritionSettings]: {
      title: string;
    };
  } = {
    vegetables: {
      title: "Vegetables in gram",
    },
    carbohydrates: {
      title: "Carbohydrates in gram",
    },
    dairy: {
      title: "Dairy in gram",
    },
    protein: {
      title: "Meat in gram",
    },
    fats: {
      title: "Fats and Oils in gram",
    },
    sweets: {
      title: "Sweets in gram",
    },
  };

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
          {Object.entries(inputFiels).map(([key, value]) => {
            const typedKey = key as keyof UserNutritionSettings;
            return (
              <Box key={key}>
                <Typography variant="subtitle1">{value.title}</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    label="Min"
                    type="number"
                    size="small"
                    value={aimedAmounts[typedKey]?.min ?? ""}
                    InputProps={{ inputProps: { min: 0 } }}
                    onChange={(e) =>
                      handleAimAmountChange(
                        Number(e.target.value),
                        typedKey,
                        "min",
                      )
                    }
                  />
                  <TextField
                    label="Max"
                    type="number"
                    size="small"
                    InputProps={{ inputProps: { min: 0 } }}
                    value={aimedAmounts[typedKey]?.max ?? ""}
                    onChange={(e) =>
                      handleAimAmountChange(
                        Number(e.target.value),
                        typedKey,
                        "max",
                      )
                    }
                  />
                </Stack>
              </Box>
            );
          })}
        </>
      )}
    </Stack>
  );
};
