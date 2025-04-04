import { useCallback, useEffect, useRef, useState } from "react";
import { auth, db } from "../../firebaseConfig.ts";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
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
import { DqqScoreBarDisplay } from "../../components/DqqCalculator/DqqResultsDisplay.tsx";
import { mergeMultipleDQQ } from "../../components/DqqCalculator/mergeMultipleDQQ.ts";
import { DqqAnswersMap } from "../../components/DqqCalculator/dqqQuestions.ts";
import {
  calculateDqqIndicators,
  DqqResultsState,
} from "../../components/DqqCalculator/calculateDqqIndicators.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { ProtectedComponent } from "../../context/ProtectedComponent.tsx";

export const MealListPage = () => {
  const [meals, setMeals] = useState<MealData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const [mealsWithDQQ, setMealsWithDQQ] = useState<
    {
      results: Partial<DqqResultsState>;
      timestamp: string;
      meals: MealData[];
    }[]
  >([]);

  const { enqueueSnackbar } = useSnackbar();
  const MEALS_PER_PAGE = 6;

  const { userProfile } = useAuth();

  useEffect(() => {
    // Group meals by day
    const mealsByDay = meals.reduce(
      (acc, meal) => {
        const date = meal.createdAt.toDate();
        const dayKey = format(date, "yyyy-MM-dd");

        if (!acc[dayKey]) {
          acc[dayKey] = [];
        }

        acc[dayKey].push(meal);
        return acc;
      },
      {} as Record<string, MealData[]>,
    );

    const _mealsWithDQQ = Object.keys(mealsByDay).map((dayKey) => {
      const mealsForDay = mealsByDay[dayKey];

      const answer = mergeMultipleDQQ(
        mealsForDay
          .map((meal) => meal.dqqData?.answers)
          .map((a) => a) as DqqAnswersMap[],
      );

      return {
        results: calculateDqqIndicators(answer, userProfile?.demographics),
        timestamp: dayKey,
        meals: mealsForDay,
      };
    });

    setMealsWithDQQ(_mealsWithDQQ);
  }, [meals]);

  const fetchMeals = useCallback(
    async (isInitialFetch = false) => {
      if (!auth.currentUser) return;

      try {
        setLoading(true);

        let q;
        if (isInitialFetch) {
          q = query(
            collection(db, "meals"),
            where("userId", "==", auth.currentUser.uid),
            orderBy("createdAt", "desc"),
            limit(MEALS_PER_PAGE),
          );
        } else {
          if (!lastDoc) return;

          q = query(
            collection(db, "meals"),
            where("userId", "==", auth.currentUser.uid),
            orderBy("createdAt", "desc"),
            startAfter(lastDoc),
            limit(MEALS_PER_PAGE),
          );
        }

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setHasMore(false);
          return;
        }

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastDoc(lastVisible);

        const newMeals = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MealData[];

        setMeals((prevMeals) =>
          isInitialFetch ? newMeals : [...prevMeals, ...newMeals],
        );
      } catch (error) {
        console.error(error);
        enqueueSnackbar("Failed to fetch meals", { variant: "error" });
      } finally {
        setLoading(false);
      }
    },
    [lastDoc, enqueueSnackbar],
  );

  useEffect(() => {
    fetchMeals(true);
  }, []);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (loading) return;

    if (observer.current) observer.current.disconnect();

    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMeals();
      }
    };

    observer.current = new IntersectionObserver(handleObserver, {
      rootMargin: "100px",
    });

    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [loading, hasMore, fetchMeals]);

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
        open={loading && meals.length === 0}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Typography variant="h4" textAlign="center" mt={5} mb={4}>
        Your Meals
      </Typography>

      {mealsWithDQQ.map((mealGroup, index) => (
        <Box key={mealGroup.timestamp} mb={4}>
          {index > 0 && <Divider sx={{ my: 3 }} />}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2 }}>
                <Grid container direction={{ xs: "column", md: "row" }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="h6" component="h2" fontWeight="bold">
                      {formatDateDisplay(mealGroup.timestamp)}
                    </Typography>
                  </Grid>
                  <ProtectedComponent allowedRoles={["SUBJECT", "ADMIN"]}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box>
                        <DqqScoreBarDisplay results={mealGroup.results} />
                      </Box>
                    </Grid>
                  </ProtectedComponent>
                </Grid>
              </Paper>
            </Grid>

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

      {hasMore && (
        <Box
          ref={loadingRef}
          display="flex"
          justifyContent="center"
          my={4}
          height="50px"
        >
          {loading && <CircularProgress size={30} />}
        </Box>
      )}

      {!hasMore && meals.length > 0 && (
        <Typography textAlign="center" color="text.secondary" my={4}>
          No more meals to load
        </Typography>
      )}

      {!loading && meals.length === 0 && (
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
