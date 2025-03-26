// Types
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  LinearProgress,
  Stack,
  styled,
  Typography,
  Tooltip,
} from "@mui/material";
import React, { ChangeEvent, useRef, useState, DragEvent } from "react";
import { useSnackbar } from "notistack";
import Compressor from "compressorjs";
import { auth, db, storage } from "../../firebaseConfig.ts";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import CloseIcon from "@mui/icons-material/Close";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import DateRangeIcon from "@mui/icons-material/DateRange";
import { format } from "date-fns";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadIcon from "@mui/icons-material/Upload";

interface ImageFile {
  file: File;
  preview: string;
  creationDate: Date | null;
  id: string;
  name: string;
}

interface UploadProgress {
  [key: string]: number;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (mealId?: string) => void;
}

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

const DropZone = styled(Box)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  backgroundColor: theme.palette.action.hover,
  textAlign: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: theme.palette.action.selected,
  },
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 120,
}));

// Component for the upload modal
export const UploadModal: React.FC<UploadModalProps> = ({
  open,
  onClose,
  onUpload,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<ImageFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [uploading, setUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]): Promise<void> => {
    // Process all files and update state
    const processedFiles = await Promise.all(files.map(processFile));
    const validFiles = processedFiles.filter((f): f is ImageFile => f !== null);
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const files = Array.from(event.target.files);

    // Reset the input to allow selecting the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    processFiles(files);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (droppedFiles.length === 0) {
      enqueueSnackbar("Please drop image files only", { variant: "warning" });
      return;
    }

    processFiles(droppedFiles);
  };

  const handleDropZoneClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Process each file
  const processFile = (file: File): Promise<ImageFile | null> => {
    return new Promise((resolve) => {
      // Extract creation date from EXIF if possible
      let creationDate: Date | null = null;

      // Create a reader to extract EXIF data
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // Try to extract the date from EXIF
          // Note: In a real app, you'd want to use a library like exif-js
          // This is a simplified approach
          creationDate = file.lastModified
            ? new Date(file.lastModified)
            : new Date();

          // Compress the image
          new Compressor(file, {
            quality: 0.8,
            maxWidth: 2048,
            maxHeight: 2048,
            resize: "contain",
            mimeType: "image/webp",
            success: (compressedResult: Blob) => {
              console.log(
                `Original size: ${file.size}, Compressed: ${compressedResult.size}`,
              );

              // Create a File from Blob with original name
              const compressedFile = new File(
                [compressedResult],
                file.name.replace(/\.[^/.]+$/, ".webp"),
                { type: "image/webp" },
              );

              resolve({
                file: compressedFile,
                preview: URL.createObjectURL(compressedResult),
                creationDate,
                id: Date.now() + Math.random().toString(36).substring(2, 9),
                name: file.name,
              });
            },
            error: (err: Error) => {
              console.error("Compression error:", err);
              enqueueSnackbar(`Failed to compress ${file.name}`, {
                variant: "error",
              });
              resolve(null);
            },
          });
        } catch (error) {
          console.error("Error processing file:", error);
          resolve(null);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => {
      // Find the file to remove
      const fileToRemove = prev.find((file) => file.id === id);

      // Revoke its object URL to prevent memory leaks
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }

      // Return filtered array
      return prev.filter((file) => file.id !== id);
    });
  };

  // Modified handleUpload function to upload each image independently in parallel
  const handleUpload = async () => {
    if (!selectedFiles.length || !auth.currentUser) return;

    setUploading(true);
    const uploadPromises: Promise<string | null>[] = [];

    try {
      // Create an array of upload promises for parallel execution
      for (const fileData of selectedFiles) {
        const uploadPromise = uploadSingleImage(fileData);
        uploadPromises.push(uploadPromise);
      }

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);

      // Filter out any failed uploads
      const successfulUploads = results.filter(
        (id): id is string => id !== null,
      );

      if (successfulUploads.length > 0) {
        enqueueSnackbar(
          `${successfulUploads.length} of ${selectedFiles.length} images uploaded successfully!`,
          { variant: "success" },
        );

        // Navigate to the most recent meal page or gallery
        if (successfulUploads.length > 0) {
          onUpload(successfulUploads[0]); // Navigate to first uploaded image
        }
      } else {
        enqueueSnackbar("No images were uploaded successfully", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error during upload:", error);
      enqueueSnackbar(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { variant: "error" },
      );
    } finally {
      setUploading(false);
      setSelectedFiles([]);
    }
  };

  // New function to handle uploading a single image and creating its document
  const uploadSingleImage = async (
    fileData: ImageFile,
  ): Promise<string | null> => {
    try {
      const imageRef = ref(
        storage,
        `images/${auth.currentUser?.uid}/${Date.now()}_${fileData.file.name}`,
      );

      // Set up upload task
      const uploadTask = uploadBytesResumable(imageRef, fileData.file);

      // Wait for upload to complete
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress((prev) => ({
              ...prev,
              [fileData.id]: progress,
            }));
          },
          (error) => {
            console.error(`Upload failed for ${fileData.name}:`, error);
            reject(error);
          },
          async () => {
            try {
              const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(imageUrl);
            } catch (error) {
              reject(error);
            }
          },
        );
      });

      // Create individual document for this image
      const docRef = await addDoc(collection(db, "meals"), {
        userId: auth.currentUser?.uid,
        createdAt: fileData.creationDate || serverTimestamp(),
        imageUrl: downloadUrl,
      });

      return docRef.id;
    } catch (error) {
      console.error(`Error uploading ${fileData.name}:`, error);
      enqueueSnackbar(`Failed to upload ${fileData.name}`, {
        variant: "error",
      });
      return null;
    }
  };

  const handleClose = () => {
    if (!uploading) {
      // Clean up object URLs to avoid memory leaks
      selectedFiles.forEach((file) => URL.revokeObjectURL(file.preview));
      setSelectedFiles([]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Upload Images</Typography>
          <IconButton
            onClick={handleClose}
            disabled={uploading}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Box my={2}>
            <DropZone
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleDropZoneClick}
              sx={{
                backgroundColor: isDragging
                  ? "action.selected"
                  : "action.hover",
                borderColor: isDragging ? "primary.dark" : "primary.main",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <AddPhotoAlternateIcon
                fontSize="large"
                color="primary"
                sx={{ mb: 1 }}
              />
              <Typography variant="body1" color="textSecondary">
                {uploading
                  ? "Upload in progress..."
                  : "Drag and drop images here or click to browse"}
              </Typography>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mt: 0.5 }}
              >
                Images will be uploaded as a single meal
              </Typography>

              <VisuallyHiddenInput
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </DropZone>
          </Box>

          {selectedFiles.length > 0 && (
            <Typography variant="subtitle1">
              {selectedFiles.length}{" "}
              {selectedFiles.length === 1 ? "image" : "images"} selected
            </Typography>
          )}

          <Grid container gap={2}>
            {selectedFiles.map((fileData) => (
              <Grid item xs={12} sm={6} md={4} key={fileData.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={fileData.preview}
                    alt={fileData.name}
                  />
                  <CardContent sx={{ pt: 1, pb: 0 }}>
                    <Typography variant="body2" noWrap>
                      {fileData.name}
                    </Typography>
                    <Tooltip title="Image creation date">
                      <Chip
                        icon={<DateRangeIcon />}
                        label={
                          fileData.creationDate
                            ? format(fileData.creationDate, "PPP")
                            : "Unknown date"
                        }
                        size="small"
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    </Tooltip>
                  </CardContent>

                  {uploadProgress[fileData.id] > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress[fileData.id]}
                      sx={{ mx: 2, my: 1 }}
                    />
                  )}

                  <CardActions>
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveFile(fileData.id)}
                      disabled={uploading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          color="primary"
        >
          {uploading
            ? `Uploading (${Object.keys(uploadProgress).length}/${selectedFiles.length})`
            : `Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? "Image" : "Images"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
