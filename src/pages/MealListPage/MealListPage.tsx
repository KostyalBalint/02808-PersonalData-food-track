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
  Typography,
} from "@mui/material";
import { MealCard } from "./MealCard.tsx";
import { MealData } from "../../../functions/src/constants.ts";
import { useSnackbar } from "notistack";
import { format } from "date-fns";

export const MealListPage = () => {
  const [meals, setMeals] = useState<MealData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const { enqueueSnackbar } = useSnackbar();
  const MEALS_PER_PAGE = 6;

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

      {Object.entries(mealsByDay).map(([day, dayMeals], index) => (
        <Box key={day} mb={4}>
          {index > 0 && <Divider sx={{ my: 3 }} />}

          <Typography variant="h6" component="h2" fontWeight="bold" mb={2}>
            {formatDateDisplay(day)}
          </Typography>

          <Grid container spacing={3}>
            {dayMeals.map((meal) => (
              <Grid item xs={12} sm={6} md={4} xl={3} key={meal.id}>
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
