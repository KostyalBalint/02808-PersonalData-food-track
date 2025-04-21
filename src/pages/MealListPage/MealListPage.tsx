import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../../firebaseConfig.ts";
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  where,
} from "firebase/firestore";
import {
  Backdrop,
  Box,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
} from "@mui/material";
import { MealCard } from "./MealCard.tsx";
import { MealData } from "../../../functions/src/constants.ts";
import { useSnackbar } from "notistack";
import { format } from "date-fns";
import { FGDSScoreDisplay } from "../../components/DqqCalculator/DqqResultsDisplay.tsx";
import { mergeMultipleDQQ } from "../../components/DqqCalculator/mergeMultipleDQQ.ts";
import { DqqAnswersMap } from "../../components/DqqCalculator/dqqQuestions.ts";
import {
  calculateDqqIndicators,
  DqqResultsState,
} from "../../components/DqqCalculator/calculateDqqIndicators.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { ProtectedComponent } from "../../context/ProtectedComponent.tsx";
import FeatureFlagGuard from "../../components/FeatureFlags/FeatureFlagGuard.tsx";
import { MealFoodPyramid } from "../../components/FoodPyramid/MealFoodPyramid.tsx";

// Helper to convert Firestore doc to MealData
const docToMealData = (doc: QueryDocumentSnapshot<DocumentData>): MealData =>
  ({
    id: doc.id,
    ...doc.data(),
  }) as MealData;

export const MealListPage = () => {
  const [meals, setMeals] = useState<MealData[]>([]);
  const [loading, setLoading] = useState(false); // Tracks loading state for pagination fetches
  const [initialLoading, setInitialLoading] = useState(true); // Tracks initial component load
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const isFetching = useRef(false); // Prevent multiple fetches at once

  const [mealsWithDQQ, setMealsWithDQQ] = useState<
    {
      results: Partial<DqqResultsState>;
      timestamp: string;
      meals: MealData[];
    }[]
  >([]);

  const { enqueueSnackbar } = useSnackbar();
  const { userProfile, demographicsComplete } = useAuth(); // Get userProfile
  const MEALS_PER_PAGE = 20;

  // Effect to group meals and calculate DQQ (runs whenever 'meals' changes)
  useEffect(() => {
    const mealsByDay = meals.reduce(
      (acc, meal) => {
        const date = meal.createdAt?.toDate
          ? meal.createdAt.toDate()
          : new Date();
        const dayKey = format(date, "yyyy-MM-dd");

        if (!acc[dayKey]) {
          acc[dayKey] = [];
        }

        acc[dayKey].push(meal);
        return acc;
      },
      {} as Record<string, MealData[]>,
    );

    const _mealsWithDQQ = Object.keys(mealsByDay)
      .sort((a, b) => b.localeCompare(a))
      .map((dayKey) => {
        const mealsForDay = mealsByDay[dayKey];
        const answer = mergeMultipleDQQ(
          mealsForDay
            .map((meal) => meal.dqqData?.answers)
            .filter((a): a is DqqAnswersMap => !!a),
        );
        return {
          results: calculateDqqIndicators(answer, userProfile?.demographics),
          timestamp: dayKey,
          meals: mealsForDay.sort(
            (a, b) =>
              (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
          ),
        };
      });
    setMealsWithDQQ(_mealsWithDQQ);
  }, [meals, userProfile?.demographics]);

  // Fetch function using getDocs for pagination
  const fetchMeals = useCallback(
    async (isInitialFetch = false) => {
      if (!userProfile || isFetching.current) return; // Check if already fetching

      setLoading(true);
      isFetching.current = true; // Mark as fetching
      if (isInitialFetch) {
        setInitialLoading(true);
        setMeals([]); // Clear meals on initial fetch for a user
        setLastDoc(null);
        setHasMore(true);
      }

      try {
        let q;
        const baseQueryConstraints = [
          where("userId", "==", userProfile.uid),
          orderBy("createdAt", "desc"),
          limit(MEALS_PER_PAGE),
        ];

        if (isInitialFetch || !lastDoc) {
          q = query(collection(db, "meals"), ...baseQueryConstraints);
        } else {
          q = query(
            collection(db, "meals"),
            ...baseQueryConstraints,
            startAfter(lastDoc), // Use the last doc from the previous fetch
          );
        }

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setHasMore(false);
          setLoading(false);
          if (isInitialFetch) setInitialLoading(false);
          isFetching.current = false;
          return;
        }

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastDoc(lastVisible); // Update lastDoc for the *next* fetch

        const newMeals = querySnapshot.docs.map(docToMealData);

        setMeals((prevMeals) =>
          isInitialFetch ? newMeals : [...prevMeals, ...newMeals],
        );

        // Check if fewer docs were returned than requested, indicating end
        if (querySnapshot.docs.length < MEALS_PER_PAGE) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching meals:", error);
        enqueueSnackbar("Failed to fetch meals", { variant: "error" });
        setHasMore(false); // Stop trying if error occurs
      } finally {
        setLoading(false);
        if (isInitialFetch) setInitialLoading(false);
        isFetching.current = false; // Mark as not fetching
      }
    },
    [userProfile, lastDoc, enqueueSnackbar], // Add dependencies
  );

  // Effect for Initial Fetch
  useEffect(() => {
    if (userProfile) {
      console.log("Fetching meals for user:", userProfile.displayName);
      fetchMeals(true);
    } else {
      // Clear state if user logs out
      setMeals([]);
      setMealsWithDQQ([]);
      setLastDoc(null);
      setHasMore(true);
      setInitialLoading(false);
      setLoading(false);
    }
    // Intentionally only run when userProfile changes to trigger a full refresh
  }, [userProfile]); // fetchMeals is stable due to useCallback

  // Effect for Real-time Listener using onSnapshot
  useEffect(() => {
    if (!userProfile) return;

    // Listen to all meals for the user, ordered by creation time
    const q = query(
      collection(db, "meals"),
      where("userId", "==", userProfile.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Only process changes if it's not the very first snapshot after initial load
        // or if meals array isn't empty (to avoid conflicts during initial fetch)
        if (initialLoading || isFetching.current) {
          return; // Skip processing during initial load or pagination fetch
        }

        setMeals((prevMeals) => {
          let updatedMeals = [...prevMeals];
          const newMealIds = new Set(updatedMeals.map((m) => m.id)); // Keep track of IDs currently in state

          snapshot.docChanges().forEach((change) => {
            const changedMeal = docToMealData(change.doc);

            if (change.type === "added") {
              // Add if not already present (accounts for potential overlap with fetch)
              // and if it's newer than the first meal currently shown OR if list is empty
              if (!newMealIds.has(changedMeal.id)) {
                const firstMealTimestamp =
                  updatedMeals.length > 0
                    ? (updatedMeals[0].createdAt?.toMillis() ?? 0)
                    : 0;
                const newMealTimestamp = changedMeal.createdAt?.toMillis() ?? 0;

                // Prepend if it's definitively newer than the current newest
                if (
                  updatedMeals.length === 0 ||
                  newMealTimestamp > firstMealTimestamp
                ) {
                  updatedMeals.unshift(changedMeal);
                }
                // Note: We are NOT adding items that might belong "in the middle"
                // of the paginated list to keep pagination logic simple.
                // They will be loaded if the user scrolls back or refreshes.
              }
            } else if (change.type === "modified") {
              const index = updatedMeals.findIndex(
                (meal) => meal.id === changedMeal.id,
              );
              if (index !== -1) {
                updatedMeals[index] = changedMeal; // Update existing meal
              }
              // If not found, it might be an item not yet loaded by pagination, ignore modification for now.
            } else if (change.type === "removed") {
              updatedMeals = updatedMeals.filter(
                (meal) => meal.id !== changedMeal.id,
              ); // Remove meal
            }
          });
          return updatedMeals; // Return the modified array
        });
      },
      (error) => {
        console.error("Real-time listener error:", error);
        enqueueSnackbar("Error listening to meal updates.", {
          variant: "error",
        });
      },
    );

    // Cleanup listener on unmount or user change
    return () => unsubscribe();
  }, [userProfile, initialLoading, enqueueSnackbar]); // Depend on userProfile and initialLoading flag

  // Effect for Intersection Observer (Infinite Scroll)
  useEffect(() => {
    if (loading || initialLoading || isFetching.current) return; // Don't observe if loading/fetching

    if (observer.current) observer.current.disconnect();

    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      // Check if intersecting, there's more data, and not currently fetching
      if (entries[0].isIntersecting && hasMore && !isFetching.current) {
        // console.log("Intersection Observer triggered fetch");
        fetchMeals(false); // Fetch next page (false means not initial)
      }
    };

    observer.current = new IntersectionObserver(handleObserver, {
      rootMargin: "800px", // Load a bit before element is visible
    });

    // Ensure loadingRef.current exists before observing
    const currentLoadingRef = loadingRef.current;
    if (currentLoadingRef) {
      observer.current.observe(currentLoadingRef);
    }

    // Cleanup: disconnect observer
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, initialLoading, hasMore, fetchMeals]); // Dependencies include fetchMeals and loading states

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return "Today";
    } else if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
      return "Yesterday";
    } else {
      return format(date, "EEEE, MMMM d, yyyy");
    }
  };

  return (
    <Container maxWidth="xl">
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={initialLoading && meals.length === 0} // Show backdrop only on initial load
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Typography variant="h4" textAlign="center" mt={5} mb={4}>
        Your Meals
      </Typography>

      {mealsWithDQQ.map((mealGroup, index) => (
        <Box key={mealGroup.timestamp} mb={4}>
          {index > 0 && <Divider sx={{ my: 3 }} />}
          {/* ... (rest of the rendering logic for meal groups and cards remains the same) ... */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              {" "}
              {/* Use item prop */}
              <Paper sx={{ p: 2 }}>
                <Grid
                  container
                  direction={{ xs: "column", md: "row" }}
                  alignItems="center"
                  spacing={2}
                >
                  <Grid size={{ xs: 12, md: 4 }}>
                    {" "}
                    {/* Use item prop */}
                    <Typography variant="h6" component="h2" fontWeight="bold">
                      {formatDateDisplay(mealGroup.timestamp)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <ProtectedComponent allowedRoles={["SUBJECT", "ADMIN"]}>
                      <FeatureFlagGuard flagKey="meal-list-food-pyramid">
                        <MealFoodPyramid meals={mealGroup.meals} />
                      </FeatureFlagGuard>
                    </ProtectedComponent>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    {/* Ensure DqqScoreBarDisplay takes up appropriate space */}
                    <ProtectedComponent allowedRoles={["SUBJECT", "ADMIN"]}>
                      <FeatureFlagGuard flagKey="meal-list-dqq">
                        {/* Check if results object is not empty before rendering */}
                        {!demographicsComplete && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            textAlign="center"
                            sx={{ flexGrow: 1 }}
                          >
                            Complete your demographics in the Settings page
                          </Typography>
                        )}
                        {mealGroup.results &&
                          Object.keys(mealGroup.results).length > 0 && (
                            <Box>
                              <FGDSScoreDisplay results={mealGroup.results} />
                            </Box>
                          )}
                      </FeatureFlagGuard>
                    </ProtectedComponent>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Render MealCards */}
            {mealGroup.meals.map((meal) => (
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 4,
                  xl: 3,
                }}
                key={meal.id}
              >
                <MealCard meal={meal} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {/* Infinite scroll loading indicator */}
      {hasMore && (
        <Box
          ref={loadingRef}
          display="flex"
          justifyContent="center"
          my={4}
          height="50px" // Give it some height for the observer
        >
          {/* Show spinner only when loading the next page */}
          {loading && !initialLoading && <CircularProgress size={30} />}
        </Box>
      )}

      {/* Message when all meals are loaded */}
      {!hasMore && meals.length > 0 && (
        <Typography textAlign="center" color="text.secondary" my={4}>
          No more meals to load
        </Typography>
      )}

      {/* Message when no meals exist */}
      {!initialLoading && !loading && meals.length === 0 && (
        <Typography
          variant="h6"
          textAlign="center"
          color="text.secondary"
          my={8}
        >
          You haven't added any meals yet
        </Typography>
      )}
    </Container>
  );
};
