import React, { useState, useMemo, useCallback, useRef } from "react";
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
  // Brush, // Remove Brush import
} from "recharts";

// Interfaces remain the same
export interface DqqTimeChartDataPoint {
  resultId: number;
  ncdProtectScore?: number;
  fgdsScore?: number;
  gdrScore?: number;
  ncdRiskScore?: number;
  timestamp: string;
  mealCount: number;
}

interface DqqTimeChartProps {
  data: DqqTimeChartDataPoint[];
  onHover?: (dataPoint: DqqTimeChartDataPoint | null) => void;
  onRangeSelect?: (selectedData: DqqTimeChartDataPoint[] | null) => void;
  chartType: "line" | "bar";
  showFeatures: {
    fgds?: boolean;
    ncdp?: boolean;
    gdr?: boolean;
    ncdr?: boolean;
  };
  valueRange?: [number, number];
  // Add optional prop to control selection color/style
  selectionColor?: string;
}

// Custom Tooltip remains the same
const CustomTooltip = ({ active, payload, label }: any) => {
  // ... (tooltip implementation remains unchanged)
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as DqqTimeChartDataPoint;
    return (
      <div
        className="custom-tooltip"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)", // Slightly transparent
          padding: "10px",
          border: "1px solid #ccc",
          fontSize: "0.8rem",
          boxShadow: "2px 2px 5px rgba(0,0,0,0.1)", // Add subtle shadow
        }}
      >
        <p
          className="label"
          style={{ fontWeight: "bold" }}
        >{`Date: ${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={`item-${index}`}
            style={{ color: entry.color, margin: "4px 0" }}
          >
            {`${entry.name}: ${entry.value?.toFixed(1)}`}
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

// Feature config remains the same
const featureConfig = {
  fgds: { dataKey: "fgdsScore", name: "DDS Score", color: "#82ca9d" },
  ncdp: { dataKey: "ncdProtectScore", name: "NCD Protect", color: "#8884d8" },
  ncdr: { dataKey: "ncdRiskScore", name: "NCD Risk", color: "#ff7300" },
  gdr: { dataKey: "gdrScore", name: "GDR Score", color: "#ffc658" },
};
type FeatureKey = keyof typeof featureConfig;

// --- Main Component ---
const DqqTimeChart: React.FC<DqqTimeChartProps> = ({
  data,
  onHover,
  onRangeSelect,
  chartType,
  showFeatures,
  selectionColor = "rgba(136, 132, 216, 0.3)", // Default selection color (semi-transparent ncdp color)
  valueRange,
}) => {
  // State to manage the selection process
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStartX, setDragStartX] = useState<string | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<string | null>(null);
  // State to hold the *final* selected range for ReferenceArea persistence
  const [finalSelection, setFinalSelection] = useState<{
    x1: string | null;
    x2: string | null;
  }>({ x1: null, x2: null });

  // Ref to track if mouse moved significantly after mousedown, to differentiate click from drag
  const hasDragged = useRef(false);

  // Find data indices based on timestamp - assumes data is sorted by timestamp
  const findDataIndex = useCallback(
    (timestamp: string | null): number => {
      if (!timestamp) return -1;
      return data.findIndex((d) => d.timestamp === timestamp);
    },
    [data],
  );

  // --- Mouse Event Handlers ---

  const handleMouseDown = useCallback(
    (e: any) => {
      // Only start selection if onRangeSelect is provided and click is on the chart plot area
      if (!onRangeSelect || !e || !e.activeLabel) {
        // If clicking outside a valid label or no handler, clear any existing selection
        if (finalSelection.x1 || finalSelection.x2) {
          setFinalSelection({ x1: null, x2: null });
          onRangeSelect?.(null); // Notify parent
        }
        return;
      }

      // Reset drag state on new mousedown
      hasDragged.current = false;
      setIsSelecting(true);
      setDragStartX(e.activeLabel); // Record the starting X value (timestamp)
      setDragCurrentX(e.activeLabel); // Initially current is same as start
      setFinalSelection({ x1: null, x2: null }); // Clear previous final selection visually during drag
    },
    [onRangeSelect, finalSelection.x1, finalSelection.x2],
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      // Handle hover regardless of selection state
      if (onHover) {
        if (e && e.activePayload && e.activePayload.length > 0) {
          const hoveredTimestamp = e.activeLabel ?? e.activeCoordinate?.label;
          const dataPoint = data.find(
            (dp) => dp.timestamp === hoveredTimestamp,
          );
          onHover(dataPoint ?? null);
        } else {
          // Don't clear hover if actively selecting, causes flicker
          if (!isSelecting) {
            onHover(null);
          }
        }
      }

      // Handle selection drag
      if (!isSelecting || !e || !e.activeLabel) return;

      // Check if mouse actually moved to differentiate from click
      if (e.activeLabel !== dragStartX && !hasDragged.current) {
        hasDragged.current = true;
      }

      setDragCurrentX(e.activeLabel); // Update the current X value
    },
    [isSelecting, onHover, data, dragStartX],
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !onRangeSelect) {
      setIsSelecting(false); // Ensure selection state is reset
      return;
    }

    setIsSelecting(false); // End selection process

    // If the mouse didn't drag significantly, treat as click and clear selection
    if (
      !hasDragged.current ||
      !dragStartX ||
      !dragCurrentX ||
      dragStartX === dragCurrentX
    ) {
      setDragStartX(null);
      setDragCurrentX(null);
      setFinalSelection({ x1: null, x2: null });
      onRangeSelect(null);
      hasDragged.current = false; // Reset drag flag
      return;
    }

    // Determine the final range boundaries
    const idx1 = findDataIndex(dragStartX);
    const idx2 = findDataIndex(dragCurrentX);

    if (idx1 === -1 || idx2 === -1) {
      console.error("Could not find data indices for selection range.");
      setDragStartX(null);
      setDragCurrentX(null);
      onRangeSelect(null);
      return;
    }

    const startIdx = Math.min(idx1, idx2);
    const endIdx = Math.max(idx1, idx2);
    const selectedData = data.slice(startIdx, endIdx + 1); // +1 as slice end is exclusive

    // Set final selection for persistent ReferenceArea
    const finalX1 = data[startIdx].timestamp;
    const finalX2 = data[endIdx].timestamp;
    setFinalSelection({ x1: finalX1, x2: finalX2 });

    // Pass selected data to parent
    onRangeSelect(selectedData.length > 0 ? selectedData : null);

    // Reset intermediate drag state
    setDragStartX(null);
    setDragCurrentX(null);
    hasDragged.current = false; // Reset drag flag
  }, [
    isSelecting,
    onRangeSelect,
    dragStartX,
    dragCurrentX,
    data,
    findDataIndex,
  ]);

  const handleMouseLeave = useCallback(() => {
    // If dragging and mouse leaves chart, end the selection
    if (isSelecting) {
      handleMouseUp();
    }
    // Clear hover state
    onHover?.(null);
  }, [isSelecting, handleMouseUp, onHover]);

  // Memoize common chart components
  const commonComponents = useMemo(
    () =>
      [
        <CartesianGrid key="grid" strokeDasharray="3 3" />,
        <XAxis key="x-axis" dataKey="timestamp" />,
        <YAxis key="y-axis" domain={valueRange} />,
        <Tooltip
          key="tooltip"
          content={<CustomTooltip />}
          allowEscapeViewBox={{ x: true, y: false }}
        />, // Keep tooltip
        <Legend key="legend" />,
        // --- Add ReferenceArea for selection ---
        // 1. Render area during drag
        isSelecting && dragStartX && dragCurrentX && hasDragged.current ? (
          <ReferenceArea
            key="drag-selection"
            x1={dragStartX < dragCurrentX ? dragStartX : dragCurrentX} // Ensure x1 is left-most
            x2={dragStartX > dragCurrentX ? dragStartX : dragCurrentX} // Ensure x2 is right-most
            stroke="none" // No border during drag? Or subtle one?
            fill={selectionColor}
            ifOverflow="visible" // Important for seeing area as you drag
            isFront={true} // Draw on top
          />
        ) : null,
        // 2. Render final persistent area after mouse up
        !isSelecting && finalSelection.x1 && finalSelection.x2 ? (
          <ReferenceArea
            key="final-selection"
            x1={finalSelection.x1}
            x2={finalSelection.x2}
            stroke="rgba(0,0,0,0.5)" // Add a subtle border to final selection
            strokeWidth={1}
            fill={selectionColor}
            ifOverflow="visible"
            isFront={true} // Draw on top
          />
        ) : null,
      ].filter(Boolean),
    [
      isSelecting,
      dragStartX,
      dragCurrentX,
      finalSelection,
      selectionColor,
      hasDragged,
    ],
  ); // Dependencies

  // Memoize FeatureSeries (remains the same logic)
  const FeatureSeries = useMemo(() => {
    const SeriesComponent = chartType === "line" ? Line : Bar;
    const lineProps = {
      type: "monotone" as const,
      dot: false,
      strokeWidth: 2,
      activeDot: { r: 6 },
    }; // Enhance activeDot
    const barProps = {
      /* barSize: 20 */
    };
    const seriesProps = chartType === "line" ? lineProps : barProps;
    const colorProp = chartType === "line" ? "stroke" : "fill";

    return Object.entries(showFeatures)
      .filter(([, isVisible]) => isVisible)
      .map(([key]) => {
        const feature = featureConfig[key as FeatureKey];
        if (!feature) return null;
        return (
          <SeriesComponent
            key={feature.dataKey}
            dataKey={feature.dataKey}
            name={feature.name}
            {...{ [colorProp]: feature.color }}
            {...seriesProps}
          />
        );
      })
      .filter(Boolean);
  }, [chartType, showFeatures]);

  // Select the main chart component based on type
  const ChartComponent = chartType === "line" ? LineChart : BarChart;

  return (
    // Container needs to allow mouse events through
    <ResponsiveContainer width="100%" height={300}>
      <ChartComponent
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        // Attach mouse handlers directly to the chart component
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave} // Handle leaving the chart area
        // syncId="dqqChartSync" // Optional: sync ID
      >
        {commonComponents}
        {FeatureSeries}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

export default DqqTimeChart;
