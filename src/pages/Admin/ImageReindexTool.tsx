import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  CheckCircle as CheckCircleIcon,
  CloudUpload as CloudUploadIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { httpsCallable } from "firebase/functions";
import { off, onValue, ref } from "firebase/database";
import { useSnackbar } from "notistack";
import { database, functions } from "../../firebaseConfig.ts";

// Define the shape of our progress data from RTDB
interface ProgressData {
  status:
    | "initializing"
    | "queuing"
    | "processing"
    | "completed"
    | "completed_with_errors"
    | "failed"
    | "error";
  processed: number;
  failures: number;
  total: number;
  error?: string;
}

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 600,
  margin: "0 auto",
}));

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

/**
 * Component for reindexing all meal images
 */
const ReindexImages: React.FC = () => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log({ progress });
  }, [progress]);

  useEffect(() => {
    console.log({ progressId });
  }, [progressId]);

  const { enqueueSnackbar } = useSnackbar();

  // Start the reindexing process
  const startReindexing = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const reindexAllImagesFunction = httpsCallable(
        functions,
        "reindexAllImages",
      );

      const result = await reindexAllImagesFunction();
      const { progressId, error } = result.data as {
        progressId: string;
        error: string;
      };

      if (error) {
        enqueueSnackbar(error, { variant: "error" });
      }

      setProgressId(progressId);
    } catch (err) {
      setError(
        `Failed to start reindexing: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Set up a listener for progress updates
  useEffect(() => {
    if (!progressId) return;

    const progressRef = ref(database, `progress/${progressId}`);

    onValue(
      progressRef,
      (snapshot) => {
        const progressData = snapshot.val() as ProgressData;
        console.log("Got data:", progressData); // Debug
        setProgress(progressData);
      },
      (error) => {
        console.error("Database error:", error);
        setError(`Database error: ${error.message}`);
      },
    );

    // Clean up the listener when component unmounts or progressId changes
    return () => {
      console.log("Cleaning up listener"); // Debug
      off(progressRef);
    };
  }, [progressId]);

  // Calculate completion percentage
  const getCompletionPercentage = (): number => {
    if (!progress || !progress.total) return 0;
    return Math.min(
      100,
      Math.round(
        ((progress.processed + (progress.failures || 0)) / progress.total) *
          100,
      ),
    );
  };

  // Get status text to display to user
  const getStatusMessage = (): string => {
    if (!progress) return "Ready to start reindexing";

    switch (progress.status) {
      case "initializing":
        return "Initializing...";
      case "queuing":
        return "Queuing images for processing...";
      case "processing":
        return "Processing images...";
      case "completed":
        return "All images have been successfully reindexed!";
      case "completed_with_errors":
        return `Reindexing completed with some errors (${progress.failures} failures)`;
      case "failed":
        return "Reindexing failed - all operations resulted in errors";
      case "error":
        return `Error: ${progress.error || "Unknown error"}`;
      default:
        return progress.status;
    }
  };

  // Get color for status chip
  const getStatusColor = ():
    | "default"
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning" => {
    if (!progress) return "default";

    switch (progress.status) {
      case "initializing":
      case "queuing":
        return "info";
      case "processing":
        return "primary";
      case "completed":
        return "success";
      case "completed_with_errors":
        return "warning";
      case "failed":
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  // Determine if button should be disabled
  const isButtonDisabled = (): boolean => {
    if (isLoading) return true;
    if (!progress) return false;
    return ["initializing", "queuing", "processing"].includes(progress.status);
  };

  // Get appropriate icon for current status
  const getStatusIcon = () => {
    if (!progress) return null;

    switch (progress.status) {
      case "completed":
        return <CheckCircleIcon color="success" />;
      case "completed_with_errors":
        return <WarningIcon color="warning" />;
      case "failed":
      case "error":
        return <ErrorIcon color="error" />;
      default:
        return progress.total > 0 ? (
          <CircularProgress size={16} thickness={6} />
        ) : null;
    }
  };

  return (
    <StyledPaper elevation={3}>
      <Stack spacing={3}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Reindex All Meal Images
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This process will analyze all meal images to enhance search
            capabilities. It may take several minutes depending on the number of
            images.
          </Typography>

          <Button
            variant="contained"
            color="primary"
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CloudUploadIcon />
              )
            }
            onClick={startReindexing}
            disabled={isButtonDisabled()}
            sx={{ mt: 1 }}
          >
            {isLoading ? "Starting..." : "Start Reindexing"}
          </Button>
        </Box>

        {error && (
          <Alert severity="error">
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {progress && (
          <Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle1">Status:</Typography>
              <Chip
                label={progress.status.toUpperCase()}
                color={getStatusColor()}
                size="small"
                icon={getStatusIcon() ?? undefined}
              />
            </Stack>

            <Typography variant="body2" sx={{ mb: 1 }}>
              {getStatusMessage()}
            </Typography>

            {progress.total > 0 && (
              <>
                <StyledLinearProgress
                  variant="determinate"
                  value={getCompletionPercentage()}
                  color={progress.failures > 0 ? "warning" : "primary"}
                />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {getCompletionPercentage()}% Complete
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {progress.processed + progress.failures} / {progress.total}
                  </Typography>
                </Stack>

                {progress.failures > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <AlertTitle>Warning</AlertTitle>
                    There were {progress.failures} errors while processing
                    images. These images may need manual review.
                  </Alert>
                )}
              </>
            )}

            {["completed", "completed_with_errors", "failed"].includes(
              progress.status,
            ) && (
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Divider sx={{ mb: 2 }} />
                <Button
                  variant="outlined"
                  onClick={() => {
                    setProgress(null);
                    setProgressId(null);
                  }}
                >
                  Reset
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Stack>
    </StyledPaper>
  );
};

export default ReindexImages;
