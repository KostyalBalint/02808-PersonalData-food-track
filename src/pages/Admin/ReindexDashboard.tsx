import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material"; // Or use Box directly if preferred
import CloseIcon from "@mui/icons-material/Close";
import { httpsCallable, HttpsCallableResult } from "firebase/functions"; // Import Functions
import { onValue, ref, Unsubscribe } from "firebase/database";
import { database, functions } from "../../firebaseConfig.ts"; // Import Realtime Database

// --- Define Cloud Function Callables ---
const callReindexAll = httpsCallable(functions, "reindexAllImages");
const callReindexSingle = httpsCallable(functions, "reindexSingleMeal");

// --- Job Progress Interface ---
interface JobProgress {
  status: string;
  processed: number;
  total: number;
  failures: number;
  error?: string | null;
  jobType: "single" | "all";
  mealId?: string | null; // Only for single jobs
}

// --- React Component ---
function ReindexDashboard() {
  const [mealIdInput, setMealIdInput] = useState<string>("");
  const [loadingAll, setLoadingAll] = useState<boolean>(false);
  const [loadingSingle, setLoadingSingle] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Record<string, JobProgress>>({}); // Store job progress by progressId

  // Refs to store active RTDB listeners to clean them up
  const listenersRef = useRef<Record<string, Unsubscribe>>({});

  // --- Function to Start Listening to RTDB Progress ---
  const startListening = useCallback((progressId: string) => {
    if (listenersRef.current[progressId]) {
      console.log(`Already listening to ${progressId}`);
      return; // Already listening
    }

    console.log(`Starting listener for progress ID: ${progressId}`);
    const progressDbRef = ref(database, `progress/${progressId}`);

    // Store the unsubscribe function returned by onValue
    listenersRef.current[progressId] = onValue(
      progressDbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const progressData = snapshot.val() as JobProgress;
          console.log(`Received update for ${progressId}:`, progressData);
          setJobs((prevJobs) => ({
            ...prevJobs,
            [progressId]: progressData,
          }));

          // Optional: Stop listening automatically when job reaches a terminal state
          // if (['completed', 'failed', 'error', 'completed_with_errors'].includes(progressData.status)) {
          //   stopListening(progressId);
          // }
        } else {
          // Handle case where progress node might be deleted or never existed properly
          console.warn(`Progress node ${progressId} does not exist.`);
          setJobs((prevJobs) => {
            const newJobs = { ...prevJobs };
            if (newJobs[progressId]) {
              newJobs[progressId].status = "unknown (deleted?)"; // Mark as unknown
            }
            return newJobs;
          });
          stopListening(progressId); // Stop listening if node disappears
        }
      },
      (listenerError) => {
        // Handle RTDB listener errors
        console.error(
          `Error listening to progress ${progressId}:`,
          listenerError,
        );
        setError(`Failed to listen to progress updates for job ${progressId}.`);
        stopListening(progressId); // Stop listening on error
      },
    );
  }, []); // Dependencies: database instance

  // --- Function to Stop Listening to RTDB Progress ---
  const stopListening = useCallback((progressId: string) => {
    if (listenersRef.current[progressId]) {
      console.log(`Stopping listener for ${progressId}`);
      listenersRef.current[progressId](); // Call the unsubscribe function
      delete listenersRef.current[progressId]; // Remove from tracked listeners
    }
  }, []);

  // --- Cleanup Listeners on Component Unmount ---
  useEffect(() => {
    // Return a cleanup function
    return () => {
      console.log("Cleaning up all RTDB listeners...");
      Object.keys(listenersRef.current).forEach(stopListening);
    };
  }, [stopListening]); // Depend on the stable stopListening function

  // --- Handler for Reindex All ---
  const handleReindexAll = async () => {
    setLoadingAll(true);
    setError(null);
    try {
      const result = (await callReindexAll()) as HttpsCallableResult<{
        progressId: string;
        message: string;
      }>;
      console.log("Reindex All result:", result.data);
      const { progressId } = result.data;
      if (progressId) {
        // Add initial job state (optional, RTDB will update it quickly)
        setJobs((prev) => ({
          ...prev,
          [progressId]: {
            status: "starting",
            processed: 0,
            total: 0,
            failures: 0,
            jobType: "all",
          },
        }));
        startListening(progressId);
      }
    } catch (err: any) {
      console.error("Error calling reindexAllImages:", err);
      setError(err.message || "Failed to start reindexing all meals.");
    } finally {
      setLoadingAll(false);
    }
  };

  // --- Handler for Reindex Single ---
  const handleReindexSingle = async () => {
    if (!mealIdInput.trim()) {
      setError("Please enter a Meal ID.");
      return;
    }
    setLoadingSingle(true);
    setError(null);
    try {
      const result = (await callReindexSingle({
        mealId: mealIdInput.trim(),
      })) as HttpsCallableResult<{ progressId: string; message: string }>;
      console.log("Reindex Single result:", result.data);
      const { progressId } = result.data;
      if (progressId) {
        // Add initial job state
        setJobs((prev) => ({
          ...prev,
          [progressId]: {
            status: "starting",
            processed: 0,
            total: 1,
            failures: 0,
            jobType: "single",
            mealId: mealIdInput.trim(),
          },
        }));
        startListening(progressId);
        setMealIdInput(""); // Clear input on success
      }
    } catch (err: any) {
      console.error("Error calling reindexSingleMeal:", err);
      const details = err.details as any;
      setError(err.message || "Failed to start reindexing single meal.");
      // If function throws error but provides progressId (e.g., queueing failed), still listen
      if (details?.progressId) {
        startListening(details.progressId);
      }
    } finally {
      setLoadingSingle(false);
    }
  };

  // --- Function to Remove a Job Display and Stop Listening ---
  const handleRemoveJob = (progressId: string) => {
    stopListening(progressId);
    setJobs((prevJobs) => {
      const newJobs = { ...prevJobs };
      delete newJobs[progressId];
      return newJobs;
    });
  };

  // --- Render Job Progress ---
  const renderJob = (id: string, job: JobProgress) => {
    const isProcessing =
      job.status === "processing" ||
      job.status === "queuing" ||
      job.status === "initializing" ||
      job.status === "starting";
    const isFinished = [
      "completed",
      "failed",
      "error",
      "completed_with_errors",
      "unknown (deleted?)",
    ].includes(job.status);
    const progressPercent =
      job.total > 0 ? ((job.processed + job.failures) / job.total) * 100 : 0;
    const successPercent =
      job.total > 0 ? (job.processed / job.total) * 100 : 0;

    let title = `Job: ${id}`;
    if (job.jobType === "single" && job.mealId) {
      title = `Reindex Meal: ${job.mealId} (Job: ${id.substring(id.lastIndexOf("_") + 1)})`;
    } else if (job.jobType === "all") {
      title = `Reindex All (Job: ${id.substring(id.lastIndexOf("_") + 1)})`;
    }

    return (
      <Paper key={id} elevation={2} sx={{ p: 2, mb: 2, position: "relative" }}>
        <IconButton
          aria-label="close"
          onClick={() => handleRemoveJob(id)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{ mr: 4 /* space for close button */ }}
        >
          {title}
        </Typography>
        <Typography variant="body2">Status: {job.status}</Typography>
        {job.total > 0 && (
          <Typography variant="body2">
            Progress: {job.processed ?? 0} processed, {job.failures ?? 0}{" "}
            failures / {job.total} total
          </Typography>
        )}
        {(isProcessing || isFinished) && job.total > 0 && (
          <Box sx={{ width: "100%", mt: 1, mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              color={job.failures > 0 ? "warning" : "primary"}
              sx={{ height: 10, borderRadius: 5 }}
            />
            {/* Optional: Show success percentage distinct from failures */}
            <LinearProgress
              variant="determinate"
              value={successPercent}
              color="success"
              sx={{
                height: 10,
                borderRadius: 5,
                mt: -1.25 /* Overlay slightly */,
              }}
            />
          </Box>
        )}
        {job.error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Error Detail: {job.error}
          </Alert>
        )}
        {job.status === "completed_with_errors" && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Job completed, but some items failed.
          </Alert>
        )}
        {job.status === "failed" && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Job failed. All items encountered errors or the job could not run.
          </Alert>
        )}
      </Paper>
    );
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Meal Image Reindexing
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* --- Reindex All Section --- */}
      <Box sx={{ mb: 4, p: 2, border: "1px solid lightgray", borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Reindex All Meals
        </Typography>
        <Button
          variant="contained"
          onClick={handleReindexAll}
          disabled={loadingAll}
          startIcon={
            loadingAll ? <CircularProgress size={20} color="inherit" /> : null
          }
        >
          {loadingAll ? "Starting..." : "Start Reindex All"}
        </Button>
      </Box>

      {/* --- Reindex Single Section --- */}
      <Box sx={{ mb: 4, p: 2, border: "1px solid lightgray", borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Reindex Single Meal
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Meal ID"
            variant="outlined"
            size="small"
            value={mealIdInput}
            onChange={(e) => setMealIdInput(e.target.value)}
            disabled={loadingSingle}
          />
          <Button
            variant="contained"
            onClick={handleReindexSingle}
            disabled={loadingSingle || !mealIdInput.trim()}
            startIcon={
              loadingSingle ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            {loadingSingle ? "Starting..." : "Reindex This Meal"}
          </Button>
        </Stack>
      </Box>

      {/* --- Active/Recent Jobs --- */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          Job Progress
        </Typography>
        {Object.keys(jobs).length === 0 ? (
          <Typography>No active reindexing jobs.</Typography>
        ) : (
          // Sort jobs perhaps? Newest first based on ID timestamp?
          Object.entries(jobs)
            // Basic sort: newest first based on timestamp in ID
            .sort(([idA], [idB]) => {
              const timeA =
                parseInt(idA.substring(idA.lastIndexOf("_") + 1), 10) || 0;
              const timeB =
                parseInt(idB.substring(idB.lastIndexOf("_") + 1), 10) || 0;
              return timeB - timeA;
            })
            .map(([id, job]) => renderJob(id, job))
        )}
      </Box>
    </Paper>
  );
}

export default ReindexDashboard;
