import React, { useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useAuth } from "../../../context/AuthContext.tsx";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebaseConfig.ts";

interface TriggerRecommendationButtonProps {
  onSuccess?: () => void; // Optional callback for successful trigger
  onError?: (message: string) => void; // Optional callback for error
}

const TriggerRecommendationButton: React.FC<
  TriggerRecommendationButtonProps
> = ({ onSuccess, onError }) => {
  const { userProfile: user } = useAuth(); // Get authenticated user
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleTrigger = async () => {
    if (!user) {
      setError("You must be logged in to generate recommendations.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Ensure the name 'triggerRecommendation' matches your exported function name in index.ts
      const triggerFunction = httpsCallable(
        functions,
        "generateRecommendations",
      );
      const result = await triggerFunction(); // No data payload needed for this specific function

      // Assuming your backend function returns { success: true, message: '...' } on success
      const data = result.data as { success?: boolean; message?: string }; // Type assertion

      if (data?.success) {
        setSuccessMessage(
          data.message ||
            "Recommendation generation started successfully! It might take a moment for new data to appear.",
        );
        if (onSuccess) onSuccess(); // Call the success callback if provided
      } else {
        throw new Error(
          data?.message || "Unknown error occurred during generation.",
        );
      }
    } catch (err: any) {
      console.error("Error triggering recommendation function:", err);
      const message =
        err.message || "Failed to trigger recommendation generation.";
      setError(message);
      if (onError) onError(message); // Call the error callback if provided
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1">
        Regenerate recommendations
      </Typography>
      <Box
        sx={{
          mt: 2,
          mb: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
          Click to generate new recommendations based on your latest meals
          (usually runs automatically daily).
        </Typography>
        <Button
          variant="contained"
          onClick={handleTrigger}
          disabled={loading || !user} // Disable if loading or not logged in
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <RefreshIcon />
            )
          }
        >
          {loading ? "Generating..." : "Generate Recommendations Now"}
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 2, width: "100%" }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2, width: "100%" }}>
            {successMessage}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default TriggerRecommendationButton;
