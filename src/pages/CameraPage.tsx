import { useCallback, useState } from "react";
import { storage, db, auth } from "../firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  Button,
  Typography,
  Container,
  Box,
  styled,
  LinearProgress,
  Stack,
} from "@mui/material";
import { useSnackbar } from "notistack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import Compressor from "compressorjs";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

export const CameraPage = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imageSrcData, setImageSrcData] = useState("");
  const [uploading, setUploading] = useState(false);

  // State for progress
  const [uploadProgress, setUploadProgress] = useState(0);

  const { enqueueSnackbar } = useSnackbar();

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        console.log(`Original file size: ${e.target.files[0].size}`);
        new Compressor(e.target.files[0], {
          quality: 0.8, // 0.6 can also be used, but its not recommended to go below.
          maxWidth: 2048,
          maxHeight: 2048,
          resize: "contain",
          mimeType: "image/webp",
          success: (compressedResult) => {
            setImage(compressedResult as File);
            setImageSrcData(URL.createObjectURL(compressedResult));
            console.log(`Original file size: ${compressedResult.size}`);
          },
        });
      }
    },
    [setImage, setImageSrcData],
  );

  const discardFile = () => {
    setImage(null);
    setImageSrcData("");
  };

  const handleUpload = async () => {
    if (!image || !auth.currentUser) return;

    setUploading(true);

    const imageRef = ref(
      storage,
      `images/${auth.currentUser.uid}/${Date.now()}_${image.name}`,
    );

    const uploadTask = uploadBytesResumable(imageRef, image);

    // Monitor upload progress
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Get upload progress
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress); // Update progress state
      },
      (error) => {
        console.error("Upload failed:", error);
        enqueueSnackbar("Failed to upload image", { variant: "error" });
        setUploading(false);
      },
      async () => {
        // Upload completed successfully
        try {
          const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);

          await addDoc(collection(db, "meals"), {
            userId: auth.currentUser?.uid,
            imageUrl,
            createdAt: serverTimestamp(),
          });

          enqueueSnackbar("Image uploaded successfully!", {
            variant: "success",
          });
          setImage(null);
        } catch (error) {
          console.error("Error during upload completion:", error);
          enqueueSnackbar("Failed to upload image", { variant: "error" });
        } finally {
          setUploading(false);
        }
      },
    );
  };

  return (
      <Container
          maxWidth="md"
          sx={{width: "100%", display: "flex", justifyContent: "center", mt: 2}}
      >
        <Box textAlign="center">
          <Typography variant="h4" gutterBottom>
            Capture & Upload Image
          </Typography>
          {!image && (
              <Button
                  component="label"
                  role={undefined}
                  variant="contained"
                  tabIndex={-1}
                  startIcon={<CloudUploadIcon/>}
              >
                Select image
                <VisuallyHiddenInput
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    multiple
                />
              </Button>
          )}
          {image && (
              <Stack gap={2} mb={2}>
                {imageSrcData && (
                    <Container maxWidth="xs">
                      <img src={imageSrcData} alt="" style={{width: "100%"}}/>
                    </Container>
                )}
                <Typography variant="subtitle1">{image.name}</Typography>
                {uploading && (
                    <LinearProgress variant="determinate" value={uploadProgress}/>
                )}
                <Stack direction="row" gap={2} justifyContent="center">
                  <Button
                      variant="contained"
                      color="error"
                      startIcon={<CloseIcon/>}
                      onClick={discardFile}
                  >
                    Discard
                  </Button>
                  <Button
                      variant="contained"
                      color="info"
                      onClick={handleUpload}
                      disabled={uploading || !image}
                  >
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                </Stack>
              </Stack>
          )}
        </Box>
      </Container>
  );
};
