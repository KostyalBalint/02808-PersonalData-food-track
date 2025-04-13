// src/components/DqqCalculator/DqqResultsDisplay.tsx
import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { IndicatorRow } from "./IndicatorRow";
import { DqqResultsState } from "./calculateDqqIndicators.ts";
import { InfoTooltip } from "../InfoTooltip.tsx";
import { FC } from "react"; // Adjust path

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

export const DqqScoreBarDisplay: FC<{ results: Partial<DqqResultsState> }> = ({
  results,
}) => {
  // Helper function to safely get scores
  const getScore = (key: keyof DqqResultsState): number => {
    const value = results[key];
    return typeof value === "number" && !isNaN(value) ? value : 0;
  };

  //const gdrScore = getScore("gdr");
  const ncdRiskScore = getScore("ncdr");
  const ncdProtectScore = getScore("ncdp");
  const fgdsScore = getScore("fgds");

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
            Dietary Diversity Score
          </Typography>
          <InfoTooltip size="small">
            <Typography variant="body2">
              <Typography
                variant="subtitle2"
                component="span"
                fontWeight="bold"
              >
                Definition
              </Typography>
              <br />
              Dietary Diversity Score DDS is used to assess the diversity within
              food groups based on a healthy and balanced diet. It assesses
              whether a person consumes a sufficient variety of foods across
              different food groups. Several studies showed that DDS could be
              used for the assessment of dietary diversity as a useful and
              practical indicator. It has been shown that a higher dietary
              diversity is correlated with improving diet quality.
              <br />
              <br />
              <Typography
                variant="subtitle2"
                component="span"
                fontWeight="bold"
              >
                Relevance
              </Typography>
              <br />A higher Dietary Diversity Score reflects meeting global
              dietary recommendations of the WHO."
            </Typography>
          </InfoTooltip>
          <Typography variant="h5" component="p" sx={{ fontWeight: "medium" }}>
            {fgdsScore.toFixed(1)}
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
