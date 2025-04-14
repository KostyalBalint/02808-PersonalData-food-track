import React, { useState, useCallback, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea, // Import ReferenceArea
} from "recharts";

export interface DqqTimeChartDataPoint {
  resultId: number;
  ncdProtectScore?: number;
  fgdsScore?: number;
  gdrScore?: number;
  ncdRiskScore?: number;
  timestamp: string; // Keep as string for axis label, used for selection
  mealCount: number;
}

interface DqqTimeChartProps {
  data: DqqTimeChartDataPoint[];
  // onHover: (dataPoint: DqqTimeChartDataPoint | null) => void; // Replaced by onRangeSelect
  onRangeSelect: (selectedData: DqqTimeChartDataPoint[]) => void; // Callback with selected range data
  chartType: "line" | "bar";
  showFeatures: {
    fgds?: boolean;
    ncdp?: boolean;
    gdr?: boolean;
    ncdr?: boolean;
  };
}

// Custom Tooltip Content (remains useful for point inspection)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as DqqTimeChartDataPoint;
    return (
      <div
        className="custom-tooltip"
        style={{
          backgroundColor: "white",
          padding: "10px",
          border: "1px solid #ccc",
          boxShadow: "2px 2px 5px rgba(0,0,0,0.1)", // Added subtle shadow
          borderRadius: "4px", // Added rounded corners
        }}
      >
        <p
          className="label"
          style={{ fontWeight: "bold", marginBottom: "5px" }}
        >
          {`Date: ${label}`}
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={`item-${index}`}
            style={{ color: entry.color, margin: "2px 0" }}
          >
            {`${entry.name}: ${entry.value?.toFixed(1) ?? "N/A"}`}{" "}
            {/* Handle potential null/undefined */}
          </p>
        ))}
        <p
          className="label"
          style={{ marginTop: "5px" }}
        >{`Meal Count: ${dataPoint.mealCount}`}</p>
      </div>
    );
  }
  return null;
};

const DqqTimeChart: React.FC<DqqTimeChartProps> = ({
  data,
  onRangeSelect,
  chartType,
  showFeatures, // Destructure showFeatures directly
}) => {
  // State for managing the selection range (using x-axis values - timestamps)
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  // Using useRef to track dragging state without causing re-renders on every mouse move
  const isDragging = useRef(false);

  // Find data index corresponding to a timestamp
  const findIndexByTimestamp = useCallback(
    (timestamp: string | null): number => {
      if (!timestamp) return -1;
      return data.findIndex((dp) => dp.timestamp === timestamp);
    },
    [data],
  );

  // --- Mouse Event Handlers for Range Selection ---

  const handleMouseDown = (e: any) => {
    // Check if click is within the main chart plot area (approximated)
    if (e && e.activeLabel) {
      isDragging.current = true;
      setRefAreaLeft(e.activeLabel); // Start selection with the clicked label
      setRefAreaRight(null); // Reset right boundary on new selection start
    } else {
      // Reset selection if clicking outside data points / labels
      isDragging.current = false;
      setRefAreaLeft(null);
      setRefAreaRight(null);
      onRangeSelect([]); // Notify parent that selection is cleared
    }
  };

  const handleMouseMove = (e: any) => {
    // Update right boundary only if dragging and over a valid label
    if (isDragging.current && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
    // If dragging started but mouse moves off active labels, keep the last known right boundary
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false; // Stop dragging state

      // Ensure we have both left and right boundaries, even if they are the same
      const finalRight = refAreaRight ?? refAreaLeft;

      if (refAreaLeft && finalRight) {
        // Find indices for the start and end timestamps
        const indexLeft = findIndexByTimestamp(refAreaLeft);
        const indexRight = findIndexByTimestamp(finalRight);

        if (indexLeft !== -1 && indexRight !== -1) {
          // Determine the actual start and end indices (handle dragging right-to-left)
          const startIndex = Math.min(indexLeft, indexRight);
          const endIndex = Math.max(indexLeft, indexRight);

          // Extract the selected data slice
          const selectedData = data.slice(startIndex, endIndex + 1);
          onRangeSelect(selectedData); // Pass selected data to parent

          // Optional: Keep the ReferenceArea visible after selection
          // To clear it visually, you could set setRefAreaLeft/Right(null) here
          // Or provide a button outside the chart to clear selection.
          // Let's keep it visible for now. Ensure correct boundaries for ReferenceArea:
          if (indexLeft > indexRight) {
            setRefAreaLeft(finalRight); // Swap state if needed for ReferenceArea x1/x2
            setRefAreaRight(refAreaLeft);
          } else {
            setRefAreaLeft(refAreaLeft);
            setRefAreaRight(finalRight);
          }
        } else {
          // If indices not found (shouldn't normally happen if labels are valid)
          onRangeSelect([]);
          setRefAreaLeft(null);
          setRefAreaRight(null);
        }
      } else {
        // If selection was invalid (e.g., only mouse down happened without valid label)
        onRangeSelect([]);
        setRefAreaLeft(null);
        setRefAreaRight(null);
      }
    }
  };

  // Handle mouse leaving the chart container during drag
  const handleMouseLeave = () => {
    if (isDragging.current) {
      // Option 1: Finalize selection with current boundaries when leaving
      handleMouseUp();
      // Option 2: Cancel selection when leaving (uncomment below)
      // isDragging.current = false;
      // setRefAreaLeft(null);
      // setRefAreaRight(null);
      // onRangeSelect([]);
    }
  };

  // Common chart components
  const commonComponents = [
    <CartesianGrid key="grid" strokeDasharray="3 3" />,
    <XAxis
      key="x-axis"
      dataKey="timestamp"
      allowDataOverflow // Prevent labels from being clipped if ReferenceArea pushes them
    />,
    <YAxis key="y-axis" />, // Assuming scores are 0-100
    <Tooltip key="tooltip" content={<CustomTooltip />} trigger="hover" />, // Keep tooltip on hover
    <Legend key="legend" />,
    // Add ReferenceArea for visualizing the selection
    // Render only when a valid range might exist (left boundary is set)
    refAreaLeft && (
      <ReferenceArea
        key="selection-area"
        yAxisId="0" // Default Y-axis ID is "0". Adjust if you have custom IDs.
        x1={refAreaLeft}
        // Use refAreaRight if dragging, otherwise stick to refAreaLeft for single point
        x2={refAreaRight ?? refAreaLeft}
        strokeOpacity={0.3}
        fill="#8884d8" // Example selection color
        fillOpacity={0.2}
        ifOverflow="visible" // Allow area to be drawn slightly outside plot if needed
      />
    ),
  ];

  const ncdpColor = "#8884d8";
  const gdrColor = "#ffc658";
  const fgdsColor = "#82ca9d";
  const ncdrColor = "#ff7300";

  // Choose the base chart component based on chartType
  const ChartComponent = chartType === "line" ? LineChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ChartComponent
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        // Attach mouse event handlers for selection
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave} // Handle leaving the chart area
      >
        {commonComponents}
        {/* Render Lines or Bars based on chartType */}
        {chartType === "line" ? (
          <>
            {showFeatures.fgds && (
              <Line
                type="monotone"
                dataKey="fgdsScore"
                name="DDS Score"
                stroke={fgdsColor}
                dot={false}
              />
            )}
            {showFeatures.ncdp && (
              <Line
                type="monotone"
                dataKey="ncdProtectScore"
                name="NCD Protect"
                stroke={ncdpColor}
                dot={false}
              />
            )}
            {showFeatures.ncdr && (
              <Line
                type="monotone"
                dataKey="ncdRiskScore"
                name="NCD Risk"
                stroke={ncdrColor}
                dot={false}
              />
            )}
            {showFeatures.gdr && (
              <Line
                type="monotone"
                dataKey="gdrScore"
                name="GDR Score"
                stroke={gdrColor}
                dot={false}
              />
            )}
          </>
        ) : (
          <>
            {showFeatures.fgds && (
              <Bar
                dataKey="fgdsScore"
                name="Dietary Diversity Score"
                fill={fgdsColor}
              />
            )}
            {showFeatures.ncdp && (
              <Bar
                dataKey="ncdProtectScore"
                name="NCD Protect"
                fill={ncdpColor}
              />
            )}
            {showFeatures.gdr && (
              <Bar dataKey="gdrScore" name="GDR Score" fill={gdrColor} />
            )}
            {showFeatures.ncdr && (
              <Bar dataKey="ncdRiskScore" name="NCD Risk" fill={ncdrColor} />
            )}
          </>
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

export default DqqTimeChart;
