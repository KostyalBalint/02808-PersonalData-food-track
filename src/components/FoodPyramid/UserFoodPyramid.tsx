import { useAuth } from "../../context/AuthContext.tsx";
import { Card, CardHeader, CircularProgress, Typography } from "@mui/material"; // Removed Slider, Box (unless Box is needed elsewhere)
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig.ts";
import { FC, useEffect, useState } from "react"; // Removed useMemo
import { MealData } from "../../../functions/src/constants.ts";
import { MealFoodPyramid } from "./MealFoodPyramid.tsx";

export const UserFoodPyramid: FC<{ daysToShowInPast?: number }> = ({
  daysToShowInPast = 5, // Default to showing the last 5 days
}) => {
  const { userProfile } = useAuth();
  const completedNutritionFacts = userProfile?.nutritionSettings !== undefined;

  const [allMeals, setAllMeals] = useState<MealData[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filteredMeals, setFilteredMeals] = useState<MealData[] | null>(null);

  useEffect(() => {
    console.log(filteredMeals);
  }, [filteredMeals]);

  // --- Fetch All Meals Data ---
  useEffect(() => {
    if (!userProfile) {
      setIsLoading(false);
      setAllMeals([]);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, "meals"),
      where("userId", "==", userProfile.uid),
      orderBy("createdAt", "asc"), // Keep ordering if needed, though filtering happens client-side
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const userMeals = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt instanceof Timestamp
              ? doc.data().createdAt
              : typeof doc.data().createdAt?.toDate === "function"
                ? doc.data().createdAt
                : Timestamp.now(), // Fallback
        })) as MealData[];

        setAllMeals(userMeals);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching meals:", error);
        setIsLoading(false);
        setAllMeals([]);
      },
    );

    return () => unsubscribe();
  }, [userProfile]);

  // --- Filter Meals Based on daysToShowInPast ---
  useEffect(() => {
    if (!allMeals) {
      setFilteredMeals(null); // No meals fetched yet
      return;
    }

    const now = new Date();
    // Calculate the cutoff date by subtracting daysToShowInPast from today.
    // Set time to the very beginning of that day (00:00:00.000)
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - daysToShowInPast);
    cutoffDate.setHours(0, 0, 0, 0);

    const cutoffTimestamp = cutoffDate.getTime();
    const nowTimestamp = now.getTime(); // Use current time as the upper bound

    const filtered = allMeals.filter((meal) => {
      const mealTime = meal.createdAt?.toDate?.().getTime();
      // Check if the meal's timestamp is within the desired range [cutoffTimestamp, nowTimestamp]
      return (
        typeof mealTime === "number" &&
        mealTime >= cutoffTimestamp &&
        mealTime <= nowTimestamp
      );
    });

    setFilteredMeals(filtered);
  }, [allMeals, daysToShowInPast]); // Update when source meals or the day range changes

  // --- Render Logic ---

  if (!completedNutritionFacts) {
    return (
      <Typography>
        Default nutrition facts not set, contact Administrators
      </Typography>
    );
  }

  if (isLoading) {
    return <CircularProgress />;
  }

  if (!allMeals) {
    // This case might briefly appear between loading finishing and filtering happening
    return <Typography>Loading meal data...</Typography>;
  }

  // Check filtered meals specifically for the "no meals in range" message
  const hasMealsInPeriod = filteredMeals && filteredMeals.length > 0;

  return (
    <Card sx={{ padding: 2 }}>
      <CardHeader title="Your food pyramid" />
      <Typography
        sx={{ textAlign: "center", marginBottom: 2, color: "text.secondary" }}
      >
        {/* Informative text about the displayed period */}
        Food pyramid based on the last {daysToShowInPast} day
        {daysToShowInPast !== 1 ? "s" : ""}.
      </Typography>
      {hasMealsInPeriod ? (
        // Render the pyramid if there are meals in the selected period
        // Removed the Grid container/item structure for simplicity, letting the pyramid take full width
        // Add back Grid if specific layout (e.g., centering, max width) is needed
        <MealFoodPyramid meals={filteredMeals} />
      ) : (
        // Display a message if no meals were found in the specified past days
        <Typography sx={{ textAlign: "center", marginTop: 2 }}>
          No meals recorded in the last {daysToShowInPast} day
          {daysToShowInPast !== 1 ? "s" : ""}.
        </Typography>
      )}
    </Card>
  );
};
