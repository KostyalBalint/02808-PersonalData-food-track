// src/components/DqqCalculator/IndicatorRow.tsx
import React, { useCallback } from "react";
import { Box, Chip, Typography, useTheme } from "@mui/material";

interface IndicatorRowProps {
  id: string;
  objectKey?: string;
  label: string;
  value: number | null | undefined; // Expect 0 (No), 1 (Yes), or null/undefined
}

export const IndicatorRow: React.FC<IndicatorRowProps> = ({
  id,
  objectKey,
  label,
  value,
}) => {
  const formatValue = useCallback(
    (
      key: string | undefined, // keyof DqqResultsState doesn't work well with dynamic keys from dqqConsumed
      value: number | null | undefined,
    ): string | number | null => {
      if (value === null || value === undefined) {
        if (key === "mddw") return "N/A";
        return null; // Or maybe '-' or 'Unknown'
      }
      // Scores and counts
      if (["gdr", "ncdp", "ncdr", "fgds"].includes(key ?? ""))
        return typeof value === "number" ? value.toFixed(1) : String(value); // Format scores
      // Binary Yes/No
      if (typeof value === "number" && (value === 0 || value === 1))
        return value === 1 ? "Yes" : "No";
      // Fallback for other numbers (shouldn't happen with current logic)
      if (typeof value === "number" && !Number.isInteger(value))
        return value.toFixed(2);

      return String(value); // Fallback
    },
    [],
  );

  const theme = useTheme();
  const chipLabel = formatValue(objectKey, value);
  const chipColor =
    chipLabel === "Yes" ? "success" : chipLabel === "No" ? "info" : "default";
  // Custom chip styling to better match the image if needed
  const chipSx = {
    width: 50, // Fixed width for alignment
    fontWeight: "bold",
    color:
      chipLabel === "Yes"
        ? theme.palette.success.contrastText
        : chipLabel === "No"
          ? theme.palette.primary.contrastText
          : undefined,
  };

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      py={0.5} // Add some vertical padding
    >
      <Box display="flex" alignItems="center">
        <Typography
          variant="body2"
          sx={{ minWidth: 30, color: "text.secondary", mr: 2 }}
        >
          {id}
        </Typography>
        <Typography variant="body1" fontSize={12}>
          {label}
        </Typography>
      </Box>
      <Chip label={chipLabel} color={chipColor} size="small" sx={chipSx} />
    </Box>
  );
};
