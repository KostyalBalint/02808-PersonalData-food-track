import React, {
  useState,
  isValidElement,
  cloneElement,
  ReactNode,
} from "react";
import { Box, Switch, FormControlLabel, Typography } from "@mui/material";
import { InfoTooltip } from "../../components/InfoTooltip.tsx";

// Define the possible chart types
type ChartType = "line" | "bar";

interface ChartToggleWrapperProps {
  children: React.ReactElement<{ chartType: ChartType }>; // Expect a single React element that accepts chartType prop
  initialChartType?: ChartType;
  lineLabel?: string;
  barLabel?: string;
  title?: string; // Optional title for the chart section
  subtitle?: string;
  infoToolTip?: ReactNode;
}

export const ChartToggleWrapper: React.FC<ChartToggleWrapperProps> = ({
  children,
  initialChartType = "line",
  lineLabel = "Line Chart",
  barLabel = "Bar Chart",
  title,
  subtitle,
  infoToolTip,
}) => {
  const [chartType, setChartType] = useState<ChartType>(initialChartType);

  const handleChartTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setChartType(event.target.checked ? "bar" : "line");
  };

  // Ensure children is a valid element before cloning
  if (!isValidElement(children)) {
    console.error(
      "ChartToggleWrapper requires a single valid React element as a child.",
    );
    return null; // Or render an error message
  }

  // Clone the child element and inject the chartType prop
  const chartElementWithProps = cloneElement(children, { chartType });

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ mr: 1 }}>
          {title && (
            <Typography variant="subtitle1" sx={{ ml: 5 }}>
              {title}
            </Typography>
          )}
          {title && (
            <Typography variant="body2" sx={{ ml: 5, color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {infoToolTip && <InfoTooltip size="small">{infoToolTip}</InfoTooltip>}
        {/* Place switch on the right if title exists, otherwise center/default */}
        <Box sx={{ ml: title ? "auto" : 0 }}>
          <FormControlLabel
            control={
              <Switch
                checked={chartType === "bar"}
                onChange={handleChartTypeChange}
                name="chartTypeToggle"
                color="primary"
              />
            }
            label={chartType === "line" ? lineLabel : barLabel}
            labelPlacement="start" // Place label before the switch
          />
        </Box>
      </Box>
      {/* Render the child (chart) with the injected prop */}
      {chartElementWithProps}
    </Box>
  );
};
