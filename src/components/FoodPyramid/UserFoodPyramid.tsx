import { useAuth } from "../../context/AuthContext.tsx";
import {
  Box,
  Card,
  CardHeader,
  CircularProgress,
  Grid,
  Slider,
  Typography,
} from "@mui/material"; // Import Slider, Box, CircularProgress
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig.ts";
import { useEffect, useMemo, useState } from "react"; // Import useMemo
import { MealData } from "../../../functions/src/constants.ts";
import { MealFoodPyramid } from "./MealFoodPyramid.tsx";

// Helper function to format timestamp (milliseconds) to a readable date string
const formatDateLabel = (timestamp: number): string => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString();
};

// Define the minimum distance in milliseconds (1 day)
const MIN_DISTANCE_MS = 24 * 60 * 60 * 1000;

export const UserFoodPyramid = () => {
  const { userProfile } = useAuth();
  const completedNutritionFacts = userProfile?.nutritionSettings !== undefined;

  const [allMeals, setAllMeals] = useState<MealData[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state for fetch

  // State for the selected date range [startTimestamp, endTimestamp] in milliseconds
  const [selectedDateRange, setSelectedDateRange] = useState<
    [number, number] | null
  >(null);

  // State for the meals filtered by the selected date range
  const [filteredMeals, setFilteredMeals] = useState<MealData[] | null>(null);

  // --- Fetch Meals Data ---
  useEffect(() => {
    if (!userProfile) {
      setIsLoading(false);
      setAllMeals([]); // Set to empty array if no user
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, "meals"),
      where("userId", "==", userProfile.uid),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const userMeals = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          // Ensure createdAt is a Firestore Timestamp before converting
          createdAt:
            doc.data().createdAt instanceof Timestamp
              ? doc.data().createdAt
              : // Attempt conversion if it's a plain object (less ideal)
                typeof doc.data().createdAt?.toDate === "function"
                ? doc.data().createdAt
                : // Fallback or handle error if type is unexpected
                  Timestamp.now(), // Or some other default/error handling
        })) as MealData[];

        setAllMeals(userMeals);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching meals:", error);
        setIsLoading(false);
        setAllMeals([]); // Set empty on error
      },
    );

    // Cleanup function
    return () => unsubscribe();
  }, [userProfile]);

  // --- Calculate Slider Range and Initialize State ---
  const { minDate, maxDate } = useMemo(() => {
    if (!allMeals || allMeals.length < 2) {
      return { minDate: null, maxDate: null };
    }
    // Ensure createdAt is valid before getting time
    const timestamps = allMeals
      .map((meal) => meal.createdAt?.toDate?.().getTime())
      .filter((ts) => typeof ts === "number");

    if (timestamps.length < 2) {
      return { minDate: null, maxDate: null };
    }

    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    return { minDate: min, maxDate: max };
  }, [allMeals]);

  // Initialize the slider range once min/max dates are available
  useEffect(() => {
    if (minDate !== null && maxDate !== null && selectedDateRange === null) {
      setSelectedDateRange([minDate, maxDate]);
    }
    // Adjust if range becomes invalid (e.g., meals deleted)
    else if (
      minDate !== null &&
      maxDate !== null &&
      selectedDateRange !== null
    ) {
      const [currentStart, currentEnd] = selectedDateRange;
      const adjustedStart = Math.max(minDate, currentStart);
      const adjustedEnd = Math.min(maxDate, currentEnd);
      // Ensure minimum distance after potential adjustment
      if (adjustedEnd - adjustedStart >= MIN_DISTANCE_MS) {
        setSelectedDateRange([adjustedStart, adjustedEnd]);
      } else {
        // If adjustment breaks min distance, reset to full range
        setSelectedDateRange([minDate, maxDate]);
      }
    } else if (minDate === null || maxDate === null) {
      // If not enough data for a range, clear selection
      setSelectedDateRange(null);
    }
  }, [minDate, maxDate]); // Rerun when min/max changes

  // --- Handle Slider Change ---
  const handleDateChange = (
    _event: Event,
    newValue: number | number[],
    activeThumb: number,
  ) => {
    if (!Array.isArray(newValue) || minDate === null || maxDate === null) {
      return;
    }

    const [newStart, newEnd] = newValue;

    if (activeThumb === 0) {
      // Start thumb moved
      const clampedStart = Math.min(newStart, maxDate - MIN_DISTANCE_MS); // Ensure end thumb can maintain min distance
      setSelectedDateRange([
        clampedStart,
        Math.max(clampedStart + MIN_DISTANCE_MS, newEnd),
      ]);
    } else {
      // End thumb moved
      const clampedEnd = Math.max(newEnd, minDate + MIN_DISTANCE_MS); // Ensure start thumb can maintain min distance
      setSelectedDateRange([
        Math.min(clampedEnd - MIN_DISTANCE_MS, newStart),
        clampedEnd,
      ]);
    }
  };

  // --- Filter Meals Based on Selected Range ---
  useEffect(() => {
    if (!allMeals || !selectedDateRange) {
      setFilteredMeals(allMeals); // If no range selected or no meals, show all (or none if allMeals is null)
      return;
    }

    const [startTime, endTime] = selectedDateRange;

    const filtered = allMeals.filter((meal) => {
      const mealTime = meal.createdAt?.toDate?.().getTime();
      // Ensure mealTime is a valid number before comparison
      return (
        typeof mealTime === "number" &&
        mealTime >= startTime &&
        mealTime <= endTime
      );
    });
    setFilteredMeals(filtered);
  }, [allMeals, selectedDateRange]); // Update when source meals or range changes

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

  if (!allMeals || allMeals.length === 0) {
    return <Typography>No meals recorded yet.</Typography>;
  }

  const canShowSlider =
    minDate !== null &&
    maxDate !== null &&
    selectedDateRange !== null &&
    maxDate - minDate >= MIN_DISTANCE_MS;

  return (
    <Card sx={{ padding: 2 }}>
      <CardHeader title="Your food pyramid" />
      <Grid container>
        <Grid size={{ xs: 12, md: 6 }}>
          {/* --- Date Range Slider --- */}
          {canShowSlider ? (
            <Box sx={{ width: "80%", margin: "20px auto" }}>
              {" "}
              {/* Center slider */}
              <Typography>
                Select Date Range: {formatDateLabel(selectedDateRange[0])} -{" "}
                {formatDateLabel(selectedDateRange[1])}
              </Typography>
              <Slider
                getAriaLabel={() => "Date range slider"}
                value={selectedDateRange}
                onChange={handleDateChange}
                valueLabelDisplay="auto"
                valueLabelFormat={formatDateLabel} // Use helper for tooltip format
                min={minDate}
                max={maxDate}
                step={MIN_DISTANCE_MS} // Optional: Step by 1 day
                disableSwap // Prevent thumbs from crossing
                sx={{
                  // Add some styling if needed
                  "& .MuiSlider-thumb": {
                    height: 20,
                    width: 20,
                  },
                  "& .MuiSlider-rail": {
                    height: 8,
                  },
                  "& .MuiSlider-track": {
                    height: 8,
                  },
                }}
              />
            </Box>
          ) : (
            allMeals.length > 0 && (
              <Typography sx={{ textAlign: "center" }}>
                Not enough meal data spread to select a range.
              </Typography>
            )
          )}
          {/* --- Display Filtered Data Count (Example) --- */}
          <Typography sx={{ textAlign: "center", marginBottom: 0 }}>
            Showing {filteredMeals ? filteredMeals.length : 0} meals in selected
            range.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <MealFoodPyramid meals={filteredMeals} />
        </Grid>
      </Grid>
    </Card>
  );
};
