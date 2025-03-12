// src/pages/Gallery.tsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Container, Typography, Grid, Card, CardMedia } from "@mui/material";

interface ImageData {
  id: string;
  imageUrl: string;
}

export const Gallery = () => {
  const [images, setImages] = useState<ImageData[]>([]);

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

    fetchImages();
  }, []);

  return (
    <Container>
      <Typography variant="h4" textAlign="center" mt={5}>
        Your Images
      </Typography>
      <Grid container spacing={3} mt={3}>
        {images.map((img) => (
          <Grid item xs={12} sm={6} md={4} key={img.id}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image={img.imageUrl}
                alt="Uploaded image"
              />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
