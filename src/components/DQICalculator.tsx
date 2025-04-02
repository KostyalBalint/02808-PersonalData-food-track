import React, { useState, KeyboardEvent } from "react";
import { httpsCallable, FunctionsError } from "firebase/functions";
import {
  Container,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  ListItemIcon,
  Grid, // For layout
  Divider, // For separation
  Tooltip, // For hints
  InputAdornment, // For units in baseline
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CalculateIcon from "@mui/icons-material/Calculate";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"; // For tooltips
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Example icons for comparison
import WarningIcon from "@mui/icons-material/Warning";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

import { functions } from "../firebaseConfig"; // Adjust path if needed

// --- Define Interfaces for Baseline and Result ---

interface BaselineData {
  grains: number;
  vegetables: number;
  fruits: number;
  protein: number;
  dairy: number;
  fatsSweets: number;
}

interface CategoryResult {
  items: string[];
  estimatedAmount: string;
  comparison: string;
}

interface CategorizedDQIResultData {
  categories: {
    Grains?: CategoryResult;
    Vegetables?: CategoryResult;
    Fruits?: CategoryResult;
    Protein?: CategoryResult;
    Dairy?: CategoryResult;
    "Fats & Sweets"?: CategoryResult;
    Other?: CategoryResult;
  };
  score: number;
  reasoning: string;
}

// Define the callable function reference
const calculateCategorizedDqiFunction = httpsCallable<
  { foodList: string[]; baseline: BaselineData }, // Input type
  CategorizedDQIResultData // Output type
>(functions, "calculateCategorizedDqi"); // Match the exported function name

// Helper to get comparison icon/color
const getComparisonStyle = (comparison: string | undefined) => {
  if (!comparison) return { icon: null, color: "text.secondary" };
  const lowerCaseComparison = comparison.toLowerCase();

  if (lowerCaseComparison.includes("met target"))
    return { icon: <CheckCircleIcon />, color: "success.main" };
  if (lowerCaseComparison.includes("within limit"))
    return { icon: <CheckCircleIcon />, color: "success.main" };
  if (lowerCaseComparison.includes("below target"))
    return { icon: <ArrowDownwardIcon />, color: "warning.main" };
  if (lowerCaseComparison.includes("above target"))
    return { icon: <ArrowUpwardIcon />, color: "warning.main" };
  if (lowerCaseComparison.includes("exceeded limit"))
    return { icon: <WarningIcon />, color: "error.main" };
  if (lowerCaseComparison.includes("significantly below"))
    return { icon: <ArrowDownwardIcon />, color: "error.main" }; // More severe 'below'

  return { icon: null, color: "text.secondary" }; // Default
};

const DQICalculator: React.FC = () => {
  const [foodInput, setFoodInput] = useState<string>("");
  const [foodList, setFoodList] = useState<string[]>([]);
  const [baseline, setBaseline] = useState<BaselineData>({
    grains: 3, // Example defaults
    vegetables: 4,
    fruits: 2,
    protein: 2,
    dairy: 2,
    fatsSweets: 1,
  });
  const [dqiResult, setDqiResult] = useState<CategorizedDQIResultData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [baselineError, setBaselineError] = useState<string | null>(null);

  // --- Input Handlers ---
  const handleAddFood = () => {
    const trimmedInput = foodInput.trim();
    if (trimmedInput) {
      setFoodList([...foodList, trimmedInput]);
      setFoodInput("");
      setError(null);
      setDqiResult(null);
    }
  };

  const handleRemoveFood = (indexToRemove: number) => {
    setFoodList(foodList.filter((_, index) => index !== indexToRemove));
    setDqiResult(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFoodInput(event.target.value);
  };

  const handleInputKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleAddFood();
    }
  };

  // --- Baseline Handler ---
  const handleBaselineChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, // Updated type
    category: keyof BaselineData,
  ) => {
    const value = event.target.value;
    // Allow empty string temporarily, parse as number, default to 0 if invalid/empty
    const numericValue = value === "" ? 0 : parseInt(value, 10);

    // Basic validation: ensure it's a non-negative number
    if (isNaN(numericValue) || numericValue < 0) {
      // Maybe set an error state for this specific field later
      console.warn(`Invalid baseline value for ${category}: ${value}`);
      setBaselineError(
        `Baseline for ${category} must be a non-negative number.`,
      );
      // Don't update state if invalid? Or set to 0? Let's set to 0 for now.
      setBaseline((prev) => ({ ...prev, [category]: 0 }));
    } else {
      setBaselineError(null); // Clear error if valid
      setBaseline((prev) => ({ ...prev, [category]: numericValue }));
    }
    setDqiResult(null); // Clear results if baseline changes
  };

  // --- Calculation Handler ---
  const handleCalculateDQI = async () => {
    if (foodList.length === 0) {
      setError("Please add at least one food item.");
      return;
    }
    if (baselineError) {
      setError("Please fix the errors in the baseline values.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDqiResult(null);

    try {
      console.log("Calling calculateCategorizedDqi function with:", {
        foodList,
        baseline,
      });

      // Call the function using the Firebase SDK
      const result = await calculateCategorizedDqiFunction({
        foodList: foodList,
        baseline: baseline, // Pass the baseline state
      });

      const resultData = result.data; // Type is CategorizedDQIResultData

      console.log("Received data from function:", resultData);

      // More robust validation based on the expected structure might be needed
      if (
        !resultData ||
        typeof resultData.score !== "number" ||
        typeof resultData.reasoning !== "string" ||
        typeof resultData.categories !== "object"
      ) {
        console.error("Invalid data format received:", resultData);
        throw new Error("Invalid response format received from the function.");
      }

      setDqiResult(resultData);
    } catch (err: any) {
      console.error("Error calling calculateCategorizedDqi function:", err);

      let errorMessage = "Failed to calculate DQI. Please try again.";
      if (err instanceof FunctionsError) {
        console.error(`Firebase Functions Error Code: ${err.code}`);
        console.error(`Firebase Functions Error Message: ${err.message}`);
        console.error(`Firebase Functions Error Details:`, err.details);
        if (err.code === "invalid-argument") {
          // Try to extract Zod error details if available
          const details = err.details as any; // Cast to any to check properties
          if (details?.fieldErrors) {
            errorMessage = `Invalid input: ${Object.entries(details.fieldErrors)
              .map(
                ([field, errors]) =>
                  `${field}: ${(errors as string[]).join(", ")}`,
              )
              .join("; ")}`;
          } else {
            errorMessage = `Error: ${err.message}`;
          }
        } else {
          errorMessage = `Calculation failed: ${err.message} (Code: ${err.code})`;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSX ---
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {" "}
      {/* Increased maxWidth */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Categorized Diet Quality Estimator
        </Typography>
        <Typography
          variant="caption"
          display="block"
          gutterBottom
          align="center"
          sx={{ mb: 2 }}
        >
          Enter foods consumed and your daily baseline targets (e.g., servings
          per day). The AI will categorize foods, estimate amounts, compare to
          your baseline, and provide a score.
        </Typography>

        {/* Baseline Input Section */}
        <Box mb={3}>
          <Typography variant="h6" component="h2" gutterBottom>
            Your Daily Baseline Targets
            <Tooltip title="Enter your target number of servings or units per day for each category. The AI will compare its estimates against these numbers.">
              <IconButton size="small" sx={{ ml: 0.5 }}>
                <InfoOutlinedIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Typography>
          {baselineError && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {baselineError}
            </Alert>
          )}
          <Grid container spacing={2}>
            {(Object.keys(baseline) as Array<keyof BaselineData>).map((key) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <TextField
                  label={
                    key.charAt(0).toUpperCase() +
                    key.slice(1).replace(/([A-Z])/g, " $1") // Add space before caps
                  }
                  type="number"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={baseline[key]}
                  onChange={(e) => handleBaselineChange(e, key)}
                  disabled={isLoading}
                  InputProps={{
                    inputProps: { min: 0 },
                    endAdornment: (
                      <InputAdornment position="end">units/day</InputAdornment>
                    ),
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Food Input Section */}
        <Typography variant="h6" component="h2" gutterBottom>
          Consumed Food Items
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <TextField
            label="Enter Food Item (e.g., 150g salmon, 1 cup rice)"
            variant="outlined"
            fullWidth
            value={foodInput}
            onChange={handleInputChange}
            onKeyPress={handleInputKeyPress}
            disabled={isLoading}
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleAddFood}
            disabled={!foodInput.trim() || isLoading}
            startIcon={<AddCircleOutlineIcon />}
          >
            Add
          </Button>
        </Box>

        {/* Food List Section */}
        {foodList.length > 0 && (
          <Box mb={3}>
            <Typography variant="subtitle1" component="h3" gutterBottom>
              Items Added:
            </Typography>
            <List
              dense
              sx={{
                maxHeight: 200,
                overflow: "auto",
                border: "1px solid #eee",
                borderRadius: "4px",
                p: 1,
              }}
            >
              {foodList.map((food, index) => (
                <ListItem
                  key={index}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveFood(index)}
                      disabled={isLoading}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{ borderBottom: "1px dashed #eee", py: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: "30px" }}>
                    <RestaurantMenuIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={food}
                    primaryTypographyProps={{ variant: "body2" }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Calculation Button */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3, mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleCalculateDQI}
            disabled={foodList.length === 0 || isLoading || !!baselineError}
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CalculateIcon />
              )
            }
          >
            {isLoading ? "Analyzing Diet..." : "Analyze & Calculate DQI"}
          </Button>
        </Box>

        {/* Result/Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {dqiResult && !isLoading && (
          <Paper elevation={1} sx={{ mt: 3, p: 2, backgroundColor: "#f9f9f9" }}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
              Diet Analysis Results
            </Typography>

            {/* Category Breakdown */}
            <Box my={2}>
              <Typography variant="h6" component="h3" gutterBottom>
                Category Breakdown vs. Baseline
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(dqiResult.categories)
                  .filter(([_, value]) => value) // Only show categories AI returned
                  .map(([categoryName, details]) => {
                    const { icon, color } = getComparisonStyle(
                      details?.comparison,
                    );
                    return (
                      <Grid item xs={12} sm={6} md={4} key={categoryName}>
                        <Paper
                          variant="outlined"
                          sx={{ p: 1.5, height: "100%" }}
                        >
                          <Typography
                            variant="subtitle1"
                            component="div"
                            fontWeight="bold"
                          >
                            {categoryName}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ minHeight: "3em", mb: 1 }}
                          >
                            Est. Amount: {details?.estimatedAmount || "N/A"}
                          </Typography>
                          <Box display="flex" alignItems="center" color={color}>
                            {icon &&
                              React.cloneElement(icon, {
                                fontSize: "small",
                                sx: { mr: 0.5 },
                              })}
                            <Typography
                              variant="body2"
                              component="span"
                              fontWeight="medium"
                            >
                              {details?.comparison || "N/A"}
                            </Typography>
                          </Box>
                          {details?.items && details.items.length > 0 && (
                            <Tooltip
                              title={details.items.join(", ")}
                              placement="top"
                            >
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{
                                  mt: 1,
                                  cursor: "help",
                                  textDecoration: "underline dotted",
                                }}
                              >
                                {details.items.length} item(s)
                              </Typography>
                            </Tooltip>
                          )}
                        </Paper>
                      </Grid>
                    );
                  })}
              </Grid>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Final Score and Reasoning */}
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="h6">
                Estimated DQI Score: {dqiResult.score}/100
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>AI Reasoning:</strong> {dqiResult.reasoning}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Disclaimer: This analysis is an AI-based estimation for
                informational purposes only. Quantities are approximate. Not a
                substitute for professional dietary advice.
              </Typography>
            </Alert>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default DQICalculator;
