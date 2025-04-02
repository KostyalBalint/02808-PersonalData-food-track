import { Card, CardHeader, Chip, Container, Grid2, Stack } from "@mui/material";
import { FoodPyramid } from "../components/FoodPyramid/FoodPyramid.tsx";
import { useRef, useState } from "react";
import useSize from "@react-hook/size";
import { useAuth } from "../context/AuthContext";

export const HomePage = () => {
  const { currentUser, userProfile } = useAuth();

  console.log(userProfile);

  const [pyramidData, setPyramidData] = useState([
    {
      id: 1,
      name: "Grains",
      percentage: 120,
      color: "#DAA520",
      subtitle: "6-11 servings",
    },
    {
      id: 2,
      name: "Vegetables",
      percentage: 90,
      color: "#32CD32",
      subtitle: "3-5 servings",
    },
    {
      id: 3,
      name: "Fruits",
      percentage: 60,
      color: "#FF69B4",
      subtitle: "2-4 servings",
    },
    {
      id: 4,
      name: "Protein",
      percentage: 110,
      color: "#FF6347",
      subtitle: "2-3 servings",
    },
    {
      id: 5,
      name: "Dairy",
      percentage: 75,
      color: "#87CEFA",
      subtitle: "2-3 servings",
    },
    {
      id: 6,
      name: "Fats, Sweets",
      percentage: 30,
      color: "#FFD700",
      subtitle: "Use sparingly",
    },
  ]);

  const updatePercentage = (id: number, newValue: string) => {
    setPyramidData(
      pyramidData.map((item) =>
        item.id === id ? { ...item, percentage: parseInt(newValue) } : item,
      ),
    );
  };

  const target = useRef(null);
  // @ts-expect-error ref object is set bellow on the element
  const [pyramidContainer] = useSize(target);

  const pyramidWidth = Math.min(pyramidContainer - 100, 500);

  return (
    <Container sx={{ mt: 2 }}>
      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" gap={2} alignItems={"center"}>
                  Hi, {currentUser?.displayName}
                  <Chip label={userProfile?.role} />
                </Stack>
              }
            ></CardHeader>
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card ref={target}>
            <CardHeader title="Your food pyramid" />
            <FoodPyramid
              pyramidData={pyramidData}
              pyramidWidth={pyramidWidth}
            />
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Card>
            {/* Controls section - moved below the pyramid */}
            <div className="w-full m-4 max-w-lg bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-3">
                Adjust Food Group Percentages
              </h3>
              {pyramidData.map((category) => (
                <div
                  key={`control-${category.id}`}
                  className="mb-3 flex items-center"
                >
                  <div className="w-32 mr-2 font-medium text-sm">
                    {category.name}:
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={category.percentage}
                    onChange={(e) =>
                      updatePercentage(category.id, e.target.value)
                    }
                    className="flex-grow mr-2"
                  />
                  <span className="w-10 text-right font-bold">
                    {category.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </Grid2>
      </Grid2>
    </Container>
  );
};
