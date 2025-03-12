// src/pages/Gallery.tsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  Backdrop,
  Card,
  CardMedia,
  CircularProgress,
  Container,
  Grid,
  Typography,
} from "@mui/material";

interface ImageData {
  id: string;
  imageUrl: string;
}

export const Gallery = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      if (!auth.currentUser) return;

      const q = query(
        collection(db, "images"),
        where("userId", "==", auth.currentUser.uid),
      );
      const querySnapshot = await getDocs(q);

      const userImages = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ImageData[];

      setImages(userImages);
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
        {images.map((img) => (
          <Grid item xs={12} sm={6} md={4} key={img.id}>
            <Card>
              <CardMedia
                component="img"
                image={img.imageUrl}
                alt="Uploaded image"
                loading="lazy"
              />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
