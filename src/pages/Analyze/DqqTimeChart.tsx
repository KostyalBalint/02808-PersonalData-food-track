import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart, // Import BarChart
  Bar, // Import Bar
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface DqqTimeChartDataPoint {
  resultId: number;
  ncdProtectScore?: number;
  gdrScore?: number;
  ncdRiskScore?: number;
  timestamp: string; // Keep as string for axis label
  mealCount: number;
}

interface DqqTimeChartProps {
  data: DqqTimeChartDataPoint[];
  // title: string; // Title is now handled outside
  onHover: (dataPoint: DqqTimeChartDataPoint | null) => void;
  chartType: "line" | "bar"; // Accept the chart type prop
}

// Custom Tooltip Content (Optional but recommended for consistency)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as DqqTimeChartDataPoint; // Access original payload
    return (
      <div
        className="custom-tooltip"
        style={{
          backgroundColor: "white",
          padding: "10px",
          border: "1px solid #ccc",
        }}
      >
        <p className="label">{`Date: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value?.toFixed(1)}`}{" "}
            {/* Use entry.name and entry.value */}
          </p>
        ))}
        <p className="label">{`Meal Count: ${dataPoint.mealCount}`}</p>
      </div>
    );
  }
  return null;
};

const DqqTimeChart: React.FC<DqqTimeChartProps> = ({
  data,
  onHover,
  chartType,
}) => {
  // Recharts hover handler - needs access to payload to call onHover
  const handleMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      // Find the original data point based on the payload identifier (e.g., timestamp)
      // The exact structure of 'e' might vary slightly between chart types or versions. Inspect 'e' if needed.
      const hoveredTimestamp = e.activeLabel ?? e.activeCoordinate?.label; // Get timestamp from label or coordinate
      const dataPoint = data.find((dp) => dp.timestamp === hoveredTimestamp);

      if (dataPoint) {
        onHover(dataPoint);
      } else {
        // Could happen briefly when moving off points
        onHover(null);
      }
    } else {
      // Call onHover with null when not hovering over a point/bar
      onHover(null);
    }
  };

  const handleMouseLeave = () => {
    onHover(null); // Clear selection when mouse leaves chart area
  };

  // Common chart components
  const commonComponents = [
    <CartesianGrid key="grid" strokeDasharray="3 3" />,
    <XAxis key="x-axis" dataKey="timestamp" />,
    <YAxis key="y-axis" />, // Assuming scores are 0-100
    <Tooltip key="tooltip" content={<CustomTooltip />} />, // Use custom tooltip
    <Legend key="legend" />,
  ];

  const ncdpColor = "#8884d8";
  const gdrColor = "#82ca9d";
  const ncdrColor = "#ff7300";

  return (
    // Use ResponsiveContainer to make the chart adapt to its parent size
    <ResponsiveContainer width="100%" height={300}>
      {chartType === "line" ? (
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onMouseMove={handleMouseMove} // Attach hover handler
          onMouseLeave={handleMouseLeave} // Attach leave handler
        >
          {commonComponents}
          <Line
            type="monotone"
            dataKey="ncdProtectScore"
            name="NCD Protect"
            stroke={ncdpColor}
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="gdrScore"
            name="GDR Score"
            stroke={gdrColor}
          />
          <Line
            type="monotone"
            dataKey="ncdRiskScore"
            name="NCD Risk"
            stroke={ncdrColor}
          />
        </LineChart>
      ) : (
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          onMouseMove={handleMouseMove} // Attach hover handler (works similarly for BarChart)
          onMouseLeave={handleMouseLeave} // Attach leave handler
        >
          {commonComponents}
          {/* Add barSize prop for better spacing if needed */}
          <Bar dataKey="ncdProtectScore" name="NCD Protect" fill={ncdpColor} />
          <Bar dataKey="gdrScore" name="GDR Score" fill={gdrColor} />
          <Bar dataKey="ncdRiskScore" name="NCD Risk" fill={ncdrColor} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
};

export default DqqTimeChart;
