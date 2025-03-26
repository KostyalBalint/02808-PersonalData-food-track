// src/pages/Gallery.tsx
import { useEffect, useState } from "react";
import { auth, db } from "../../firebaseConfig.ts";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Backdrop,
  CircularProgress,
  Container,
  Grid,
  Typography,
} from "@mui/material";
import { MealCard } from "./MealCard.tsx";
import { MealData } from "../../constants.ts";

export const MealListPage = () => {
  const [meals, setMeals] = useState<MealData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      if (!auth.currentUser) return;

      const q = query(
        collection(db, "meals"),
        where("userId", "==", auth.currentUser.uid),
      );
      const querySnapshot = await getDocs(q);

      const userMeals = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MealData[];

      if (userMeals) setMeals(userMeals);
    };

    fetchImages().finally(() => setLoading(false));
  }, []);

  return (
    <Container>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Typography variant="h4" textAlign="center" mt={5}>
        Your Images
      </Typography>
      <Grid container spacing={3} mt={3}>
        {meals.map((meal) => (
          <Grid item xs={12} sm={6} md={4} key={meal.id}>
            <MealCard meal={meal} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
