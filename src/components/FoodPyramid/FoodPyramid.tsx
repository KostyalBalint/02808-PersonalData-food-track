import { FC } from "react";
import {CategoryAmounts} from "../../pages/HomePage.tsx";

type PyramidData = {
    key: keyof CategoryAmounts;
    name: string;
    percentage: number;
    color: string;
    subtitle: string;
}

type FoodPyramidProps = {
  pyramidWidth?: number;
  pyramidData: PyramidData[];
};

export const FoodPyramid: FC<FoodPyramidProps> = ({
  pyramidWidth = 500,
  pyramidData,
}) => {
  const pyramidHeight = (pyramidWidth / 5) * 4;
  const borderWidth = 2;
  const borderColor = "gray";
  const rowHeight = pyramidHeight / pyramidData.length;

  // Calculate dimensions for the borders
  const hypotenuse = Math.sqrt(
    Math.pow(pyramidWidth / 2, 2) + Math.pow(pyramidHeight, 2),
  );
  const angle = Math.atan(pyramidHeight / (pyramidWidth / 2)) * (180 / Math.PI);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4">
      <div
        className="w-full relative mb-8"
        style={{ height: `${pyramidHeight}px` }}
      >
        {/* Left border (top-left to bottom-left) */}
        <div
          className="absolute origin-top-left"
          style={{
            width: `${hypotenuse}px`,
            height: `${borderWidth}px`,
            borderBottom: `${borderWidth}px dashed ${borderColor}`,
            bottom: 0,
            left: `calc(50% - ${pyramidWidth / 2}px)`,
            transform: `rotate(-${angle}deg)`,
            zIndex: 1,
          }}
        ></div>

        {/* Right border (top-right to bottom-right) */}
        <div
          className="absolute origin-top-right"
          style={{
            width: `${hypotenuse}px`,
            height: `${borderWidth}px`,
            borderBottom: `${borderWidth}px dashed ${borderColor}`,
            bottom: 0,
            right: `calc(50% - ${pyramidWidth / 2}px)`,
            transform: `rotate(${angle}deg)`,
            zIndex: 1,
          }}
        ></div>

        {/* Bottom border */}
        <div
          className="absolute"
          style={{
            width: `${pyramidWidth}px`,
            height: `${borderWidth}px`,
            borderBottom: `${borderWidth}px dashed ${borderColor}`,
            top: `${pyramidHeight}px`,
            left: "50%",
            transform: `translate(-50%, -${borderWidth}px)`,
            zIndex: 1,
          }}
        ></div>

        {/* Pyramid sections - from top to bottom */}
        {pyramidData.map((category, index) => {
          // Calculate dimensions for each row
          const yPosition = (pyramidData.length - 1 - index) * rowHeight;
          const topWidth =
            pyramidWidth *
            ((pyramidData.length - index - 1) / pyramidData.length);
          const bottomWidth =
            pyramidWidth * ((pyramidData.length - index) / pyramidData.length);

          // Calculate the slope for angled ends (angle in radians)
          const slopeAngle = Math.atan(
            (bottomWidth - topWidth) / (2 * rowHeight),
          );
          const slopeTan = Math.tan(slopeAngle);

          return (
            <div
              key={category.key}
              className="absolute flex items-center justify-center"
              style={{
                width: `${bottomWidth}px`,
                height: `${rowHeight}px`,
                top: `${yPosition}px`,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1,
              }}
            >
              {/* Background for the row */}
              <div className="absolute w-full h-full opacity-30"></div>

              {/* Container for the bar */}
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Left side of the bar with angled end */}
                <div
                  className="absolute h-full opacity-80"
                  style={{
                    width: `${Math.min(category.percentage / 2, 50)}%`,
                    right: "50%",
                    backgroundColor: category.color,
                    clipPath: `polygon(${rowHeight * slopeTan}px 0, 100% 0, 100% 100%, 0 100%)`,
                  }}
                ></div>

                {/* Right side of the bar with angled end */}
                <div
                  className="absolute h-full opacity-80"
                  style={{
                    width: `${Math.min(category.percentage / 2, 50)}%`,
                    left: "50%",
                    backgroundColor: category.color,
                    clipPath: `polygon(0 0, 0 100%, 100% 100%, calc(100% - ${rowHeight * slopeTan}px) 0)`,
                  }}
                ></div>

                {/* Left overextension (when exceeding 100%) */}
                {category.percentage > 100 && (
                  <div
                    className="absolute h-full"
                    style={{
                      width: `calc(${category.percentage - 100}% + ${rowHeight * slopeTan}px)`,
                      right: `calc(50% + 50%)`,
                      backgroundColor: category.color,
                      backgroundImage:
                        "linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent)",
                      backgroundSize: "10px 10px",
                      translate: `${rowHeight * slopeTan}px`,
                      clipPath: `polygon(${rowHeight * slopeTan}px 0, 100% 0, calc(100% - ${rowHeight * slopeTan}px) 100%, 0 100%)`,
                    }}
                  ></div>
                )}

                {/* Right overextension (when exceeding 100%) */}
                {category.percentage > 100 && (
                  <div
                    className="absolute h-full"
                    style={{
                      width: `calc(${category.percentage - 100}% + ${rowHeight * slopeTan}px)`,
                      left: `calc(50% + 50%)`,
                      backgroundColor: category.color,
                      backgroundImage:
                        "linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1) 75%, transparent 75%, transparent)",
                      backgroundSize: "10px 10px",
                      translate: `-${rowHeight * slopeTan}px`,
                      clipPath: `polygon(0 0, calc(100% - ${rowHeight * slopeTan}px) 0, 100% 100%, ${rowHeight * slopeTan}px 100%)`,
                    }}
                  ></div>
                )}

                {/* Text content */}
                <div className="z-10 text-sm w-4/5 flex justify-between">
                  <div>
                    <div className="font-medium">{category.name}</div>
                  </div>
                  <div className="font-bold">{category.percentage.toFixed(2)}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
