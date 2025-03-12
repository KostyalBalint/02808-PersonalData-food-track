import { useState } from "react";
import { storage, db, auth } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Button, Typography, Container, Box } from "@mui/material";

export const Camera = () => {
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!image || !auth.currentUser) return;

    setUploading(true);
    const imageRef = ref(
      storage,
      `images/${auth.currentUser.uid}/${Date.now()}_${image.name}`,
    );

    try {
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, "images"), {
        userId: auth.currentUser.uid,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      alert("Image uploaded successfully!");
      setImage(null);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box textAlign="center" mt={5}>
        <Typography variant="h4" gutterBottom>
          Capture & Upload Image
        </Typography>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ display: "block", margin: "20px auto" }}
        />
        {image && <Typography variant="subtitle1">{image.name}</Typography>}
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={uploading || !image}
        >
          {uploading ? "Uploading..." : "Upload Image"}
        </Button>
      </Box>
    </Container>
  );
};
