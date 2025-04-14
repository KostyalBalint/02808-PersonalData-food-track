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
  ReferenceArea,
} from "recharts";

// Interfaces remain the same
export interface DqqTimeChartDataPoint {
  // ... (interface props)
  resultId: number;
  ncdProtectScore?: number;
  fgdsScore?: number;
  gdrScore?: number;
  ncdRiskScore?: number;
  timestamp: string;
  mealCount: number;
}

interface DqqTimeChartProps {
  // ... (interface props)
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
  selectionColor?: string;
}

// Custom Tooltip remains the same
const CustomTooltip = ({ active, payload, label }: any) => {
  // ... (tooltip implementation unchanged)
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload as DqqTimeChartDataPoint;
    return (
      <div
        className="custom-tooltip"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "10px",
          border: "1px solid #ccc",
          fontSize: "0.8rem",
          boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
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
  selectionColor = "rgba(136, 132, 216, 0.3)",
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStartX, setDragStartX] = useState<string | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<string | null>(null);
  const [finalSelection, setFinalSelection] = useState<{
    x1: string | null;
    x2: string | null;
  }>({ x1: null, x2: null });
  // State to hold the data selected after mouseup, before mouseleave triggers the callback
  const [pendingSelectionData, setPendingSelectionData] = useState<
    DqqTimeChartDataPoint[] | null
  >(null);

  const hasDragged = useRef(false);

  const findDataIndex = useCallback(
    (timestamp: string | null): number => {
      if (!timestamp) return -1;
      return data.findIndex((d) => d.timestamp === timestamp);
    },
    [data],
  );

  // --- Event Handlers ---

  const handleMouseDown = useCallback(
    (e: any) => {
      // Clear previous selections and pending data on new click/drag start
      setFinalSelection({ x1: null, x2: null });
      setPendingSelectionData(null); // Clear any pending selection
      if (onRangeSelect) {
        // Notify parent immediately that the previous selection (if any) is cleared
        // Do this *only* if there was a selection previously (visual or pending)
        if (finalSelection.x1 || pendingSelectionData) {
          onRangeSelect(null);
        }
      }

      // Only start selection if onRangeSelect is provided and click is on the chart plot area
      if (!onRangeSelect || !e || !e.activeLabel) {
        // If clicking outside or no handler, ensure selection state is off
        setIsSelecting(false);
        setDragStartX(null);
        setDragCurrentX(null);
        hasDragged.current = false;
        return;
      }

      hasDragged.current = false;
      setIsSelecting(true);
      setDragStartX(e.activeLabel);
      setDragCurrentX(e.activeLabel);
    },
    [onRangeSelect, finalSelection.x1, pendingSelectionData],
  ); // Add pendingSelectionData dependency

  const handleMouseMove = useCallback(
    (e: any) => {
      // Hover logic (remains mostly the same)
      if (onHover) {
        if (e && e.activePayload && e.activePayload.length > 0) {
          const hoveredTimestamp = e.activeLabel ?? e.activeCoordinate?.label;
          const dataPoint = data.find(
            (dp) => dp.timestamp === hoveredTimestamp,
          );
          onHover(dataPoint ?? null);
        } else {
          if (!isSelecting) {
            // Avoid clearing hover during selection drag
            onHover(null);
          }
        }
      }

      // Selection drag update
      if (!isSelecting || !e || !e.activeLabel) return;

      if (e.activeLabel !== dragStartX && !hasDragged.current) {
        hasDragged.current = true;
      }
      setDragCurrentX(e.activeLabel);
    },
    [isSelecting, onHover, data, dragStartX],
  );

  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return; // Exit if not selecting

    const wasDragging = hasDragged.current; // Capture drag status before resetting
    const startX = dragStartX; // Capture start X
    const currentX = dragCurrentX; // Capture end X

    // Reset intermediate drag state *immediately* on mouseup
    setIsSelecting(false);
    setDragStartX(null);
    setDragCurrentX(null);
    hasDragged.current = false;

    // If it wasn't a drag (just a click) or no valid range, clear everything and exit
    if (
      !wasDragging ||
      !startX ||
      !currentX ||
      startX === currentX ||
      !onRangeSelect
    ) {
      setFinalSelection({ x1: null, x2: null }); // Ensure visual area is cleared
      setPendingSelectionData(null); // Ensure no pending data
      // Optionally call onRangeSelect(null) on click here if desired,
      // otherwise it waits for mousedown or mouseleave after pending.
      // Let's keep it consistent: only fire on mouseleave or mousedown clears.
      return;
    }

    // --- It was a valid drag ---
    const idx1 = findDataIndex(startX);
    const idx2 = findDataIndex(currentX);

    if (idx1 === -1 || idx2 === -1) {
      console.error("Could not find data indices for selection range.");
      setFinalSelection({ x1: null, x2: null }); // Clear visuals
      setPendingSelectionData(null); // Clear pending
      return;
    }

    const startIdx = Math.min(idx1, idx2);
    const endIdx = Math.max(idx1, idx2);
    const selectedData = data.slice(startIdx, endIdx + 1);

    // Set final *visual* selection area
    const finalX1 = data[startIdx].timestamp;
    const finalX2 = data[endIdx].timestamp;
    setFinalSelection({ x1: finalX1, x2: finalX2 });

    // Store the data to be sent on mouseleave
    setPendingSelectionData(selectedData.length > 0 ? selectedData : null);

    // --- DO NOT call onRangeSelect here ---
  }, [
    isSelecting,
    onRangeSelect,
    dragStartX,
    dragCurrentX,
    data,
    findDataIndex,
  ]);

  const handleMouseLeave = useCallback(() => {
    // 1. Handle case where mouse leaves *during* an active drag
    if (isSelecting) {
      // Treat leaving during drag as completing the selection at the current point
      handleMouseUp(); // This will calculate, set finalSelection, set pendingSelectionData, and reset drag state
      // Now, fall through to the logic below to immediately fire the callback because we are leaving
    }

    // 2. Check if there's a selection pending to be reported
    if (pendingSelectionData && onRangeSelect) {
      onRangeSelect(pendingSelectionData);
      setPendingSelectionData(null); // Clear pending data after firing event
    } else if (!isSelecting && !finalSelection.x1 && onRangeSelect) {
      // If leaving and there's no active selection visual and no pending data,
      // ensure parent knows selection is null (covers edge case after a click-clear)
      // This might be redundant if mousedown already cleared, but safe to include.
      // onRangeSelect(null); // Re-evaluate if this is needed / causes issues
    }

    // 3. Clear hover state
    onHover?.(null);
  }, [
    isSelecting,
    handleMouseUp,
    onRangeSelect,
    pendingSelectionData,
    onHover,
    finalSelection.x1,
  ]); // Add dependencies

  // --- Memoized Components ---

  const commonComponents = useMemo(
    () =>
      [
        <CartesianGrid key="grid" strokeDasharray="3 3" />,
        <XAxis key="x-axis" dataKey="timestamp" />,
        <YAxis key="y-axis" />,
        <Tooltip
          key="tooltip"
          content={<CustomTooltip />}
          allowEscapeViewBox={{ x: true, y: false }}
        />,
        <Legend key="legend" />,
        // ReferenceArea for dragging (only visible *during* drag and *after* actual movement)
        isSelecting && dragStartX && dragCurrentX && hasDragged.current ? (
          <ReferenceArea
            key="drag-selection"
            x1={dragStartX < dragCurrentX ? dragStartX : dragCurrentX}
            x2={dragStartX > dragCurrentX ? dragStartX : dragCurrentX}
            stroke="none"
            fill={selectionColor}
            ifOverflow="visible"
            isFront={true}
          />
        ) : null,
        // ReferenceArea for the final selection (visible *after* mouseup, before mouseleave)
        !isSelecting && finalSelection.x1 && finalSelection.x2 ? (
          <ReferenceArea
            key="final-selection"
            x1={finalSelection.x1}
            x2={finalSelection.x2}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={1}
            fill={selectionColor}
            ifOverflow="visible"
            isFront={true}
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
  );

  const FeatureSeries = useMemo(() => {
    // ... (FeatureSeries implementation remains unchanged)
    const SeriesComponent = chartType === "line" ? Line : Bar;
    const lineProps = {
      type: "monotone" as const,
      dot: false,
      strokeWidth: 2,
      activeDot: { r: 6 },
    };
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

  const ChartComponent = chartType === "line" ? LineChart : BarChart;

  // --- Render ---
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ChartComponent
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave} // MouseLeave triggers the final callback
      >
        {commonComponents}
        {FeatureSeries}
      </ChartComponent>
    </ResponsiveContainer>
  );
};

export default DqqTimeChart;
