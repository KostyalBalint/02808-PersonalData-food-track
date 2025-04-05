import React, { useCallback, useEffect, useRef, useState } from "react";
import { auth, db, storage } from "../../firebaseConfig.ts";
import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  UploadTask,
} from "firebase/storage";
import {
  addDoc,
  collection,
  DocumentReference,
  serverTimestamp,
} from "firebase/firestore";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  LinearProgress,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import SwitchCameraIcon from "@mui/icons-material/SwitchCamera";
import Compressor from "compressorjs";
import { useNavigate } from "react-router-dom";
import { UploadModal } from "./UploadModal.tsx";
import EditIcon from "@mui/icons-material/Edit";
import { CreateMealWithoutImage } from "./CreateMealWithoutImage.tsx";

const CameraContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  maxWidth: 500,
  margin: "0 auto",
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
  boxShadow: theme.shadows[3],
}));

const VideoPreview = styled("video")({
  width: "100%",
  height: "auto",
  display: "block",
});

const CanvasPreview = styled("canvas")({
  display: "none", // Hidden canvas for capturing frames
});

export const CameraPage: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imageSrcData, setImageSrcData] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [createMealWithoutImageModalOpen, setCreateMealWithoutImageModalOpen] =
    useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Initialize camera
  useEffect(() => {
    startCamera();

    // Cleanup when component unmounts
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async (): Promise<void> => {
    try {
      setLoading(true);

      // Stop any existing stream first
      stopCamera();

      // Get new stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      enqueueSnackbar("Unable to access camera", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = (): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const switchCamera = (): void => {
    setFacingMode((prevMode) =>
      prevMode === "environment" ? "user" : "environment",
    );
  };

  const capturePhoto = (): void => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to the canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          enqueueSnackbar("Failed to capture image", { variant: "error" });
          return;
        }

        new Compressor(blob, {
          quality: 0.8,
          maxWidth: 2048,
          maxHeight: 2048,
          resize: "contain",
          mimeType: "image/webp",
          success: (compressedResult: Blob) => {
            console.log(`Original blob size: ${blob.size}`);
            console.log(`Compressed file size: ${compressedResult.size}`);

            // Create a filename
            const filename = `camera_capture_${Date.now()}.webp`;

            // Create File from Blob with filename
            const file = new File([compressedResult], filename, {
              type: "image/webp",
            });

            setImage(file);
            setImageSrcData(URL.createObjectURL(compressedResult));
          },
          error: (error: Error) => {
            console.error("Failed to compress image:", error);
            enqueueSnackbar("Failed to compress image", { variant: "error" });
          },
        });
      },
      "image/jpeg",
      0.95,
    );
  };

  const discardFile = (): void => {
    if (imageSrcData) {
      URL.revokeObjectURL(imageSrcData);
    }
    setImage(null);
    setImageSrcData("");
    startCamera();
  };

  const handleUpload = useCallback(async (): Promise<void> => {
    if (!image || !auth.currentUser) return;

    setUploading(true);

    const imageRef = ref(
      storage,
      `images/${auth.currentUser.uid}/${Date.now()}_${image.name}`,
    );

    console.log(`Uploading image`, image);
    const uploadTask: UploadTask = uploadBytesResumable(imageRef, image);

    // Monitor upload progress
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        // Get upload progress
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
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

          const doc: DocumentReference = await addDoc(collection(db, "meals"), {
            userId: auth.currentUser?.uid,
            imageUrl,
            createdAt: serverTimestamp(),
          });

          navigate(`/meal/${doc.id}`);

          enqueueSnackbar("Image uploaded successfully!", {
            variant: "success",
          });
          setImage(null);
          setImageSrcData("");
        } catch (error) {
          console.error("Error during upload completion:", error);
          enqueueSnackbar("Failed to upload image", { variant: "error" });
        } finally {
          setUploading(false);
        }
      },
    );
  }, [image, enqueueSnackbar, navigate]);

  const handleOpenUploadModal = (): void => {
    setUploadModalOpen(true);
  };

  const handleUploadComplete = (mealId?: string): void => {
    setUploadModalOpen(false);
    if (mealId) {
      navigate(`/meal/${mealId}`);
    } else {
      navigate("/");
    }
  };

  return (
    <Container
      maxWidth="md"
      sx={{ width: "100%", display: "flex", justifyContent: "center", mt: 5 }}
    >
      <Box textAlign="center" width="100%">
        {/* Camera view - always visible when no image is captured */}

        <CameraContainer>
          {loading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 5,
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          )}
          {!image && (
            <>
              <VideoPreview ref={videoRef} autoPlay playsInline muted />
              <CanvasPreview ref={canvasRef} />

              <Button
                variant="contained"
                color="secondary"
                disabled={loading}
                onClick={switchCamera}
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                }}
              >
                <SwitchCameraIcon />
              </Button>

              <Stack
                direction="row"
                spacing={2}
                sx={{
                  position: "absolute",
                  bottom: 16,
                  left: 0,
                  right: 0,
                  justifyContent: "center",
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!cameraActive || loading}
                  startIcon={<CameraAltIcon />}
                  onClick={capturePhoto}
                >
                  Capture
                </Button>
              </Stack>
            </>
          )}
          {image && imageSrcData && (
            <img src={imageSrcData} alt="" style={{ width: "100%" }} />
          )}
        </CameraContainer>

        {!image && (
          <Stack
            direction="row"
            spacing={2}
            sx={{
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              color="info"
              startIcon={<CloudUploadIcon />}
              onClick={handleOpenUploadModal}
            >
              Select multiple images
            </Button>
            <Button
              sx={{ mt: 2 }}
              variant="contained"
              color="info"
              startIcon={<EditIcon />}
              onClick={() => {
                setCreateMealWithoutImageModalOpen(true);
              }}
            >
              Create meal without image
            </Button>
          </Stack>
        )}

        {/* Captured image preview and controls */}
        {image && (
          <Stack gap={2} mb={2}>
            <Typography variant="subtitle1">{image.name}</Typography>
            {uploading && (
              <LinearProgress variant="determinate" value={uploadProgress} />
            )}
            <Stack direction="row" gap={2} justifyContent="center">
              <Button
                variant="contained"
                color="error"
                startIcon={<CloseIcon />}
                onClick={discardFile}
                disabled={uploading}
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

        {/* Upload Modal */}
        <UploadModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUpload={handleUploadComplete}
        />
        <CreateMealWithoutImage
          open={createMealWithoutImageModalOpen}
          onClose={() => setCreateMealWithoutImageModalOpen(false)}
          onUpload={handleUploadComplete}
        />
      </Box>
    </Container>
  );
};
