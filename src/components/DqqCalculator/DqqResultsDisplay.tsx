// src/components/DqqCalculator/DqqResultsDisplay.tsx
import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Slider,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { IndicatorRow } from "./IndicatorRow";
import { DqqResultsState } from "./calculateDqqIndicators.ts";
import { InfoTooltip } from "../InfoTooltip.tsx";
import { FC } from "react"; // Adjust path
// Import appropriate icons
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied"; // Neutral-ish face
import SentimentVerySatisfiedIcon from "@mui/icons-material/SentimentVerySatisfied";

// Keep the definition of rows needed for display
const extraIndicatorRows = [
  { id: "1", key: "all5", label: "All-5" },
  { type: "divider", key: "divider1" },
  { id: "1a", key: "all5a", label: "At least one vegetable" },
  { id: "1b", key: "all5b", label: "At least one fruit" },
  { id: "1c", key: "all5c", label: "At least one pulse, nut or seed" },
  { id: "1d", key: "all5d", label: "At least one animal-source food" },
  { id: "1e", key: "all5e", label: "At least one starchy staple" },
  { type: "divider", key: "divider2" },
  { id: "2", key: "mddw", label: "MDD-W (Min. Dietary Diversity for Women)" },
  { id: "3", key: "fgds", label: "Food Group Diversity Score (FGDS)" },
  { type: "divider", key: "divider3" },
  { id: "4", key: "zvegfr", label: "Zero Vegetables or Fruit" },
  { id: "4a", key: "vegfr", label: "At least one Vegetable or Fruit" },
  {
    id: "4b",
    key: "dveg_consumption",
    label: "Dark Green Leafy Veg Consumption",
  },
  { id: "4c", key: "oveg_consumption", label: "Other Vegetables Consumption" },
  { id: "4d", key: "ofr_consumption", label: "Other Fruits Consumption" },
  { type: "divider", key: "divider4" },
  { id: "5", key: "pulse_consumption", label: "Pulse Consumption" },
  {
    id: "6",
    key: "nuts_seeds_consumption",
    label: "Nuts or Seeds Consumption",
  },
  { id: "7", key: "whole_grain_consumption", label: "Whole Grain Consumption" },
  { type: "divider", key: "divider5" },
  { id: "8", key: "anml", label: "Meat, Poultry, or Fish Consumption" },
  {
    id: "8a",
    key: "processed_meat_consumption",
    label: "Processed Meat Consumption",
  },
  { id: "8b", key: "umeat", label: "Unprocessed Red Meat Consumption" },
  { id: "8c", key: "dairy", label: "Dairy Consumption" },
  { type: "divider", key: "divider6" },
  // Risk-related Food Group Indicators
  { id: "9", key: "safd", label: "Salty or Fried Snack Consumption" },
  { id: "9a", key: "snf", label: "Salty Snacks, Noodles, or Fast Food" },
  {
    id: "10",
    key: "deep_fried_consumption",
    label: "Deep Fried Food Consumption",
  },
  { id: "11", key: "swtfd", label: "Sweet Foods Consumption" },
  { id: "12", key: "soft_drink_consumption", label: "Soft Drink Consumption" },
  { id: "12a", key: "swtbev", label: "Sweet Beverages Consumption" },
];

interface DqqResultsDisplayProps {
  results: Partial<DqqResultsState>;
  demographicsComplete: boolean;
}

export function DqqResultsDisplay({
  results,
  demographicsComplete,
}: DqqResultsDisplayProps) {
  const theme = useTheme();

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent
        sx={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        {!demographicsComplete ? (
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ mt: 2 }} color="textSecondary">
              Complete demographic information to view indicators.
            </Typography>
          </Box>
        ) : (
          <>
            {/* --- Top Scores --- */}
            <FGDSScoreDisplay results={results} />

            <DqqScoreBarDisplay results={results} />

            {/* --- Indicator List --- */}
            <Box
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                mt: 2,
                backgroundColor: theme.palette.grey[100],
                p: 2,
                borderRadius: 1,
              }}
            >
              {extraIndicatorRows.map(({ key, label, type, id }) => {
                if (type === "divider") {
                  return <Divider key={key} sx={{ my: 1 }} />;
                }
                return (
                  <IndicatorRow
                    key={key}
                    objectKey={key} // Pass the specific key
                    id={id ?? ""}
                    label={label ?? ""}
                    value={results[key]} // Access result using the key
                  />
                );
              })}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const DDSScoreTooltipInfo = () => {
  return (
    <Typography variant="body2">
      <Typography variant="subtitle2" component="span" fontWeight="bold">
        Name
      </Typography>
      <br />
      Dietary Diversity Score (DDS)
      <br />
      <Typography variant="subtitle2" component="span" fontWeight="bold">
        Definition
      </Typography>
      <br />
      DDS is used to assess the diversity within food groups based on a healthy
      and balanced diet. It assesses whether a person consumes a sufficient
      variety of foods across different food groups. Several studies showed that
      DDS could be used for the assessment of dietary diversity as a useful and
      practical indicator. It has been shown that a higher dietary diversity is
      correlated with improving diet quality.
      <br />
      <Typography variant="subtitle2" component="span" fontWeight="bold">
        Relevance
      </Typography>
      <br />
      Indicates how diverse your diet is (0 = Low, 10 = High)
    </Typography>
  );
};

export const FGDSScoreDisplay: FC<{
  results: Partial<DqqResultsState>;
}> = ({ results }) => {
  // Helper function to safely get scores
  const getScore = (key: keyof DqqResultsState): number => {
    const value = results[key];
    // Ensure score is within 0-10 range, default to 0 if invalid
    return typeof value === "number" && !isNaN(value)
      ? Math.max(0, Math.min(10, value))
      : 0;
  };

  const fgdsScore = getScore("fgds");

  // Determine icon and color based on score
  const getScoreVisuals = (score: number) => {
    if (score <= 3) {
      return {
        icon: SentimentVeryDissatisfiedIcon,
        color: "error.main", // Red
        label: "Low Diversity",
      };
    } else if (score <= 7) {
      return {
        icon: SentimentSatisfiedIcon,
        color: "warning.main", // Orange/Yellow
        label: "Moderate Diversity",
      };
    } else {
      return {
        icon: SentimentVerySatisfiedIcon,
        color: "success.main", // Green
        label: "High Diversity",
      };
    }
  };

  const {
    icon: ScoreIcon,
    color: scoreColor,
    label: scoreLabel,
  } = getScoreVisuals(fgdsScore);

  return (
    <Stack spacing={1.5} alignItems="center" sx={{ width: "100%", py: 2 }}>
      {/* Title and Tooltip */}
      <Stack
        direction="row"
        justifyContent="center"
        alignItems="center"
        gap={0.5}
      >
        <Typography variant="h5" component="p" sx={{ fontWeight: "medium" }}>
          DDS Score
        </Typography>
        <InfoTooltip size="small">
          <DDSScoreTooltipInfo />
        </InfoTooltip>
        {/* Display Score Text Separately */}
        <Typography variant="h5" component="p" sx={{ fontWeight: "medium" }}>
          ({fgdsScore.toFixed(1)})
        </Typography>
      </Stack>

      {/* Visual Representation: Icon + Slider */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ width: "90%", maxWidth: 400 }} // Control max width for aesthetics
      >
        {/* Score Icon */}
        <ScoreIcon
          sx={{ fontSize: 35, color: scoreColor }}
          aria-label={scoreLabel}
        />

        {/* Visual Slider */}
        <Slider
          aria-label={`FGDS Score Visual: ${fgdsScore.toFixed(1)} out of 10 - ${scoreLabel}`}
          value={fgdsScore}
          min={0}
          max={10}
          step={0.1} // Match precision of display if needed
          disabled // Make it non-interactive
          sx={{
            color: scoreColor, // Color the track and thumb
            height: 8, // Make slider thicker
            cursor: "default", // Show default cursor as it's disabled
            "& .MuiSlider-thumb": {
              width: 20,
              height: 20,
              backgroundColor: scoreColor, // Ensure thumb color matches
              // Remove hover effects on disabled thumb
              "&:hover, &.Mui-focusVisible, &.Mui-active": {
                boxShadow: "none",
              },
            },
            "& .MuiSlider-track": {
              border: "none",
              backgroundColor: scoreColor, // Ensure track color matches
            },
            "& .MuiSlider-rail": {
              opacity: 0.3,
              backgroundColor: "grey.400", // Dimmed background rail
            },
            // Override Mui's disabled style to keep our color
            "&.Mui-disabled": {
              color: scoreColor,
            },
          }}
        />
        {/* Optional: Add min/max labels if desired */}
        {/* <Typography variant="caption">0</Typography> */}
        {/* <Typography variant="caption">10</Typography> */}
      </Stack>
      {/* You could add the score label text here too if desired */}
      {/* <Typography variant="body2" sx={{ color: scoreColor }}>{scoreLabel}</Typography> */}
    </Stack>
  );
};
export const DqqScoreBarDisplay: FC<{ results: Partial<DqqResultsState> }> = ({
  results,
}) => {
  // Helper function to safely get scores
  const getScore = (key: keyof DqqResultsState): number => {
    const value = results[key];
    return typeof value === "number" && !isNaN(value) ? value : 0;
  };

  const gdrScore = getScore("gdr");
  const ncdRiskScore = getScore("ncdr");
  const ncdProtectScore = getScore("ncdp");

  // Define max scores for bar width calculation
  const maxRiskScore = 8;
  const maxProtectScore = 9;

  // Calculate bar widths
  const riskWidthPercent = Math.min(50, (ncdRiskScore / maxRiskScore) * 50);
  const protectWidthPercent = Math.min(
    50,
    (ncdProtectScore / maxProtectScore) * 50,
  );

  const theme = useTheme();

  return (
    <>
      <Box
        sx={{
          textAlign: "center",
          mb: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          pb: 2,
        }}
      >
        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          gap={0.5}
        >
          <Typography variant="h5" component="p" sx={{ fontWeight: "medium" }}>
            GDR Score
          </Typography>
          <InfoTooltip size="small">
            GDR (Global Diet Quality Score) is a measure of the overall
          </InfoTooltip>
          <Typography variant="h5" component="p" sx={{ fontWeight: "medium" }}>
            {gdrScore.toFixed(1)}
          </Typography>
        </Stack>
        <Grid container spacing={1} justifyContent="center" alignItems="center">
          <Grid
            size={{ xs: 6 }}
            sx={{
              textAlign: "right",
              pr: 1,
              borderRight: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="body1">
              NCD-Risk Score {ncdRiskScore.toFixed(1)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }} sx={{ textAlign: "left", pl: 1 }}>
            <Typography variant="body1">
              NCD-Protect Score {ncdProtectScore.toFixed(1)}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* --- Bar Chart --- */}
      <Box
        sx={{
          display: "flex",
          width: "100%",
          height: 15,
          my: 2,
          backgroundColor: theme.palette.grey[300],
          position: "relative",
        }}
      >
        {/* Risk Bar */}
        <Box
          sx={{
            height: "100%",
            width: `${riskWidthPercent}%`,
            backgroundColor: theme.palette.error.light,
            transition: "width 0.3s ease-in-out",
            position: "absolute",
            right: "50%",
          }}
        />
        {/* Protect Bar */}
        <Box
          sx={{
            height: "100%",
            width: `${protectWidthPercent}%`,
            backgroundColor: theme.palette.success.light,
            transition: "width 0.3s ease-in-out",
            position: "absolute",
            left: "50%",
          }}
        />
        {/* Center Divider */}
        <Divider
          orientation="vertical"
          flexItem
          sx={{
            position: "absolute",
            left: "50%",
            height: "100%",
            bgcolor: "rgba(0, 0, 0, 0.3)",
          }}
        />
      </Box>
    </>
  );
};
