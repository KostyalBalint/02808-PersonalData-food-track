import { useMemo, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  ActiveElement,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartEvent,
  ChartOptions,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns"; // Import the date adapter
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import { debounce } from "../../utils/debounce.ts";

// Register necessary Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Register TimeScale
);

// --- Define Types ---

// Interface for a single data point in the input array
export interface DqqTimeChartDataPoint {
  resultId: number;
  timestamp: string | Date; // Allow ISO string or Date object as input
  gdrScore: number;
  ncdRiskScore: number;
  ncdProtectScore: number;
}

// Interface for the component's props
export interface TimeSeriesChartProps {
  /**
   * Array of data points. Each object must have 'timestamp', 'gdrScore', 'ncdRiskScore', 'ncdProtectScore'.
   * Timestamp should be a valid date string (parsable by `new Date()`) or a Date object.
   */
  data: DqqTimeChartDataPoint[];
  /** Optional title for the chart */
  title?: string;

  onHover?: (dataPoint: DqqTimeChartDataPoint | null) => void;
}

// --- Component Implementation ---

function DqqTimeChart({
  data,
  title = "Health Scores Over Time",
  onHover,
}: TimeSeriesChartProps) {
  // Ref to access the chart instance. Typed for a Line chart.
  // The data is number[], and the labels (x-axis) are Date objects.
  const chartRef = useRef<ChartJS<"line", number[], Date> | null>(null);

  // --- Debounced Hover Handler ---
  const debouncedHoverLog = debounce(
    (pointData: DqqTimeChartDataPoint | null) => {
      if (onHover) onHover(pointData);
    },
    150,
  );

  // --- Hover Handler ---
  const handleHover = (
    _event: ChartEvent, // Use ChartEvent type from chart.js
    activeElements: ActiveElement[], // Use ActiveElement[] type
    chart: ChartJS<"line", number[], Date>, // Use ChartJS instance type matching the ref/chart
  ) => {
    if (!chart || activeElements.length === 0) {
      debouncedHoverLog(null); // Clear log if not hovering over anything
      return;
    }

    // Use 'nearest' mode logic built into Chart.js options for finding the point
    // Extract the index from the first active element (nearest point)
    const { index } = activeElements[0];

    // Get the original data point using the index
    // Add checks for index validity and data existence
    const originalDataPoint =
      index >= 0 && index < data.length ? data[index] : null;

    if (originalDataPoint) {
      debouncedHoverLog(originalDataPoint);
    } else {
      debouncedHoverLog(null); // Handle edge case where index might be invalid
    }
  };

  // --- Prepare Chart Data (Memoized) ---
  // Specify the ChartData type, including chart type ('line'), data type (number[]), and label type (Date)
  const chartData: ChartData<"line", number[], Date> = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Ensure timestamps are valid Date objects for the time scale
    // Use map directly to Date objects for labels
    const labels: Date[] = data.map((item) => new Date(item.timestamp));
    const gdrScores: number[] = data.map((item) => item.gdrScore);
    const riskScores: number[] = data.map((item) => item.ncdRiskScore);
    const protectScores: number[] = data.map((item) => item.ncdProtectScore);

    return {
      labels: labels,
      datasets: [
        {
          label: "GDR Score",
          data: gdrScores,
          borderColor: "rgb(128, 128, 128)", // Gray
          backgroundColor: "rgba(128, 128, 128, 0.5)",
          tension: 0.1,
        },
        {
          label: "NCD-Risk Score",
          data: riskScores,
          borderColor: "rgb(255, 99, 132)", // Red
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          tension: 0.1,
        },
        {
          label: "NCD-Protect Score",
          data: protectScores,
          borderColor: "rgb(75, 192, 192)", // Green/Teal
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          tension: 0.1,
        },
      ],
    };
  }, [data]); // Recalculate only when input data changes

  // --- Chart Options (Memoized) ---
  // Specify the ChartOptions type, including chart type ('line')
  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false, // Allows chart height to be controlled by container
      plugins: {
        legend: {
          position: "top" as const, // Use 'as const' for literal types expected by Chart.js
        },
        title: {
          display: !!title, // Only display if title is provided
          text: title,
        },
        tooltip: {
          mode: "index" as const,
          intersect: false,
        },
      },
      scales: {
        x: {
          type: "time" as const, // Crucial for time series data!
          time: {
            unit: "day" as const, // Adjust based on your data density
            tooltipFormat: "PPpp", // date-fns format (e.g., Oct 26, 2023, 10:00:00 AM)
            displayFormats: {
              day: "MMM d, yyyy", // Format for axis labels
            },
          },
          title: {
            display: true,
            text: "Date / Time",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Score",
          },
        },
      },
      // Interaction settings for hover ("skimming")
      interaction: {
        mode: "nearest" as const,
        axis: "x" as const,
        intersect: false,
      },
      // Custom hover handler - Type inference works here, but explicit is possible
      // Ensure the handleHover function signature matches what onHover expects
      onHover: handleHover, // Pass the typed handler function
    }),
    [title, handleHover],
  ); // Recalculate options if title or hover handler changes

  // --- Render Component ---
  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ height: "400px", position: "relative" }}>
        {" "}
        {/* Control chart size */}
        {data && data.length > 0 ? (
          <Line ref={chartRef} options={options} data={chartData} />
        ) : (
          <Typography variant="body1" align="center" sx={{ mt: 4 }}>
            No data available to display the chart.
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default DqqTimeChart;

// --- Example Usage (in another .tsx file, e.g., App.tsx) ---
/*
import React from 'react';
import TimeSeriesChart from './TimeSeriesChart'; // Assuming it's in the same directory
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Sample Data (type checking happens here too)
const sampleData: DataPoint[] = [ // Use the DataPoint type
  { timestamp: '2023-10-20T10:00:00Z', gdrScore: 70, ncdRiskScore: 25, ncdProtectScore: 75 },
  { timestamp: new Date('2023-10-21T11:30:00Z'), gdrScore: 72, ncdRiskScore: 22, ncdProtectScore: 78 }, // Example using Date object
  { timestamp: '2023-10-22T09:15:00Z', gdrScore: 68, ncdRiskScore: 30, ncdProtectScore: 70 },
  { timestamp: '2023-10-23T14:00:00Z', gdrScore: 75, ncdRiskScore: 18, ncdProtectScore: 82 },
  { timestamp: '2023-10-24T16:45:00Z', gdrScore: 76, ncdRiskScore: 15, ncdProtectScore: 85 },
  { timestamp: '2023-10-25T08:00:00Z', gdrScore: 73, ncdRiskScore: 20, ncdProtectScore: 80 },
  { timestamp: '2023-10-26T12:20:00Z', gdrScore: 78, ncdRiskScore: 12, ncdProtectScore: 88 },
];

// Basic MUI theme (optional)
const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <h1>Health Score Dashboard</h1>
          <TimeSeriesChart data={sampleData} title="Patient Health Scores Over Time" />
          {/* Add more components here *}
      </Container>
    </ThemeProvider>
  );
}

export default App;

// Remember to define DataPoint interface where sampleData is declared,
// or import it from TimeSeriesChart.tsx if sampleData lives elsewhere.
*/
