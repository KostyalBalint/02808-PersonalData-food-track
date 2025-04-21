import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext.tsx";
import { RecommendationDoc } from "../../functions/src/constants.ts";
import { db } from "../firebaseConfig.ts";
import { useSnackbar } from "notistack";
// Remove useSwipeable import if ONLY used for view switching, as SwipeableViews handles it
// import { useSwipeable } from "react-swipeable";
import SwipeableViews from "react-swipeable-views"; // Import SwipeableViews
// --- Import Icons ---
import GrainIcon from "@mui/icons-material/Grain";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import SpaIcon from "@mui/icons-material/Spa";
import CarrotIcon from "@mui/icons-material/FoodBank";
import AppleIcon from "@mui/icons-material/Apple";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import EggIcon from "@mui/icons-material/Egg";
import LocalCafeIcon from "@mui/icons-material/LocalCafe";
import NutsIcon from "@mui/icons-material/FilterVintage";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

// --- Helper Functions (formatCategoryName, getCategoryIcon - Keep as is) ---
const formatCategoryName = (key: string): string => {
  /* ... */
  const names: { [key: string]: string } = {
    wholeGrain: "Whole Grains",
    pulses: "Pulses (Beans, Peas, Lentils)",
    vitaminAVegetable: "Vitamin A-Rich Orange Vegetables",
    darkGreenVegetable: "Dark Green Leafy Vegetables",
    otherVegetable: "Other Vegetables",
    vitaminAFruit: "Vitamin A-Rich Fruits",
    citrusFruit: "Citrus Fruits",
    otherFruit: "Other Fruits",
    protein: "Protein (Meat, Fish, Eggs)",
    dairy: "Dairy (Cheese, Yogurt, Milk)",
    nutsSeeds: "Nuts or Seeds",
  };
  return (
    names[key] ||
    key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
  );
};
const getCategoryIcon = (key: string): React.ReactElement => {
  /* ... */
  const icons: { [key: string]: React.ReactElement } = {
    wholeGrain: <GrainIcon />,
    pulses: <LocalFloristIcon color="success" />,
    vitaminAVegetable: <CarrotIcon color="warning" />,
    darkGreenVegetable: <SpaIcon color="success" />,
    otherVegetable: <LocalFloristIcon color="primary" />,
    vitaminAFruit: <AppleIcon sx={{ color: "#FFA500" }} />,
    citrusFruit: <WaterDropIcon color="info" />,
    otherFruit: <AppleIcon color="error" />,
    protein: <EggIcon />,
    dairy: <LocalCafeIcon />,
    nutsSeeds: <NutsIcon color="action" />,
  };
  return icons[key] || <HelpOutlineIcon />;
};

// --- RecommendationCategoryItem Component (Keep as is) ---
interface RecommendationCategoryItemProps {
  /* ... */ categoryKey: string;
  ingredients: string[] | { name: string }[];
}
const RecommendationCategoryItem: React.FC<RecommendationCategoryItemProps> = ({
  categoryKey,
  ingredients,
}) => {
  /* ... */
  const [showAll, setShowAll] = useState(false);
  const MAX_INITIAL_ITEMS = 3;

  const formatIngredient = (ingredient: string | { name: string }): string => {
    if (typeof ingredient === "string") return ingredient;
    if (
      typeof ingredient === "object" &&
      ingredient !== null &&
      "name" in ingredient
    )
      return ingredient.name;
    console.warn("Unexpected ingredient format:", ingredient);
    return "[Unknown Item]";
  };

  const ingredientsToDisplay = useMemo(() => {
    const formatted = ingredients.map(formatIngredient);
    return showAll ? formatted : formatted.slice(0, MAX_INITIAL_ITEMS);
  }, [ingredients, showAll]);

  const totalIngredients = ingredients.length;

  return (
    <ListItem
      disableGutters
      sx={{ alignItems: "flex-start", flexDirection: "column", py: 1 }}
    >
      <Box display="flex" alignItems="center" width="100%">
        <ListItemIcon sx={{ minWidth: 40 }}>
          {getCategoryIcon(categoryKey)}
        </ListItemIcon>
        <ListItemText
          primary={formatCategoryName(categoryKey)}
          primaryTypographyProps={{ variant: "subtitle1", fontWeight: "bold" }}
          sx={{ mb: 0.5 }}
        />
      </Box>
      <Box pl={5} width="100%">
        <Typography variant="body2" color="text.primary">
          {ingredientsToDisplay.join(", ")}
          {totalIngredients > MAX_INITIAL_ITEMS && !showAll && (
            <MoreHorizIcon
              fontSize="small"
              sx={{ verticalAlign: "middle", ml: 0.5, color: "text.secondary" }}
            />
          )}
        </Typography>
        {totalIngredients > MAX_INITIAL_ITEMS && (
          <Button
            size="small"
            onClick={() => setShowAll(!showAll)}
            sx={{ textTransform: "none", p: 0, mt: 0.5 }}
          >
            {showAll
              ? "Show Less"
              : `Show ${totalIngredients - MAX_INITIAL_ITEMS} More`}
          </Button>
        )}
      </Box>
    </ListItem>
  );
};

// --- Main Component ---
const FoodRecommendations: React.FC = () => {
  const { userProfile: user, loading: authLoading } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationDoc[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRecIndex, setCurrentRecIndex] = useState(0);

  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isTouchDevice = useMediaQuery(theme.breakpoints.down("md"));

  // --- Fetching Logic (Unchanged) ---
  useEffect(() => {
    const fetchRecommendations = async (userId: string) => {
      setLoading(true);
      setError(null);
      setCurrentRecIndex(0);
      try {
        const recommendationsRef = collection(db, "recommendations");
        const q = query(
          recommendationsRef,
          where("userId", "==", userId),
          orderBy("createdAt", "desc") /* limit(10) */,
        );
        const querySnapshot = await getDocs(q);
        const fetchedDocs: RecommendationDoc[] = querySnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              categoriesToEat: doc.data().categoriesToEat || {},
            }) as RecommendationDoc,
        );
        setRecommendations(fetchedDocs);
      } catch (err: any) {
        console.error("Error fetching recommendations:", err);
        setError(
          `Failed to load recommendations: ${err.message || "Please try again later."}`,
        );
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading) {
      if (user) {
        fetchRecommendations(user.uid);
      } else {
        setLoading(false);
        setRecommendations([]);
      }
    }
  }, [user, authLoading]);

  // --- Date Formatting (Unchanged) ---
  const formatDate = (timestamp: Timestamp | undefined): string => {
    /* ... */
    if (!timestamp) return "Unknown Date";
    if (
      timestamp instanceof Timestamp &&
      typeof timestamp.toDate === "function"
    ) {
      try {
        return format(timestamp.toDate(), "PPP");
      } catch (formatError) {
        console.error("Error formatting date:", formatError);
        return "Invalid Date";
      }
    }
    if (timestamp instanceof Date) {
      try {
        return format(timestamp, "PPP");
      } catch (formatError) {
        console.error("Error formatting date:", formatError);
        return "Invalid Date";
      }
    }
    console.warn("Received unexpected date format:", timestamp);
    return "Invalid Date";
  };

  // --- Error Snackbar (Unchanged) ---
  useEffect(() => {
    if (error) {
      enqueueSnackbar(error, { variant: "error" });
    }
  }, [error, enqueueSnackbar]);

  // --- Navigation Handlers (Simplified - just update the index) ---
  const handleIndexChange = (index: number) => {
    setCurrentRecIndex(index);
  };

  const goToNext = () => {
    // Ensure index doesn't go out of bounds
    setCurrentRecIndex((prevIndex) =>
      Math.min(prevIndex + 1, recommendations.length - 1),
    );
  };

  const goToPrevious = () => {
    // Ensure index doesn't go out of bounds
    setCurrentRecIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  // --- Remove useSwipeable hook if it's no longer needed ---
  // const handleSwipe = useSwipeable({ ... }); // Remove this

  // --- Loading / No User / No Data States (Unchanged) ---
  if (authLoading || loading)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  if (!user)
    return (
      <Alert severity="info">Please log in to view your recommendations.</Alert>
    );
  if (recommendations.length === 0)
    return (
      <Alert severity="info">
        No recommendations available yet. Check back later!
      </Alert>
    );

  // --- Render Helper for Content (Keep as is) ---
  const renderRecommendationContent = (
    recDoc: RecommendationDoc | undefined,
  ) => {
    if (!recDoc)
      return (
        <Typography sx={{ p: 2, fontStyle: "italic", color: "text.secondary" }}>
          Loading...
        </Typography>
      );

    const categories = Object.entries(recDoc.categoriesToEat || {}).filter(
      ([_, ingredients]) => ingredients && ingredients.length > 0,
    );

    if (categories.length === 0) {
      return (
        <Typography sx={{ p: 2, fontStyle: "italic", color: "text.secondary" }}>
          No specific food groups recommended for this day.
        </Typography>
      );
    }
    return (
      <List dense disablePadding sx={{ px: 1 }}>
        {" "}
        {/* Added slight padding for content inside slide */}
        {categories.map(([categoryKey, ingredients]) => (
          <RecommendationCategoryItem
            key={categoryKey}
            categoryKey={categoryKey}
            ingredients={ingredients}
          />
        ))}
      </List>
    );
  };

  // --- Get the currently selected recommendation data ---
  // Note: SwipeableViews needs the *full array* to render, it manages the current view internally based on index
  // const currentRecommendation = recommendations[currentRecIndex]; // We don't need this specific variable here anymore for rendering the list

  // --- Main Render Logic ---
  return (
    <Card sx={{ mt: 2, overflow: "hidden" }}>
      {" "}
      {/* Keep overflow hidden */}
      {/* Header Section (Title, Subtitle, Divider) */}
      <Box sx={{ p: 2, pb: 0 }}>
        {" "}
        {/* Padding for header */}
        <Typography variant="h5" gutterBottom component="h2">
          Your Food Recommendations
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Suggestions to help diversify your diet.
          {recommendations.length > 1 &&
            isTouchDevice &&
            " Swipe left/right to view different dates."}
          {recommendations.length > 1 &&
            !isTouchDevice &&
            " Use the arrows to view different dates."}
        </Typography>
        <Divider sx={{ my: 2 }} />
        {/* --- Navigation Header (Date and Buttons) --- */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={isTouchDevice ? 0 : 2}
        >
          {" "}
          {/* Reduce margin bottom on touch devices */}
          <IconButton
            onClick={goToPrevious}
            disabled={currentRecIndex === 0}
            aria-label="Previous recommendation date"
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{ fontWeight: "medium", textAlign: "center", flexGrow: 1 }}
          >
            {/* Display date of the currently visible recommendation */}
            {formatDate(recommendations[currentRecIndex]?.createdAt)}
          </Typography>
          <IconButton
            onClick={goToNext}
            disabled={currentRecIndex === recommendations.length - 1}
            aria-label="Next recommendation date"
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>
      {/* --- Content Area --- */}
      {isTouchDevice ? (
        // --- MOBILE/TABLET: SwipeableViews ---
        <Box
          sx={{ position: "relative", pb: recommendations.length > 1 ? 4 : 0 }}
        >
          {" "}
          {/* Container for SwipeableViews and dots */}
          <SwipeableViews
            index={currentRecIndex}
            onChangeIndex={handleIndexChange} // Update state when user swipes
            enableMouseEvents // Allow dragging with mouse for easier testing/desktop touch
            containerStyle={
              {
                // Optional: Add transition styles if needed, but defaults are usually good
                // transition: 'transform 0.35s cubic-bezier(0.15, 0.3, 0.25, 1) 0s'
              }
            }
            slideStyle={
              {
                // Ensure slides don't try to shrink or grow unexpectedly
                // overflow: 'hidden', // Might clip content, use with caution
                // padding: '0 8px' // Add padding around each slide if needed
              }
            }
          >
            {/* Map recommendations to create each slide */}
            {recommendations.map((recDoc) => (
              <Box
                key={recDoc.id}
                sx={{ minHeight: 150 /* Optional: Ensure minimum height */ }}
                p={2}
              >
                {renderRecommendationContent(recDoc)}
              </Box>
            ))}
          </SwipeableViews>
          {/* Dots Indicator */}
          {recommendations.length > 1 && (
            <Box
              display="flex"
              justifyContent="center"
              sx={{
                position: "absolute", // Position dots at the bottom
                bottom: 8,
                left: 0,
                right: 0,
              }}
            >
              {recommendations.map((_, index) => (
                <Box
                  key={index}
                  component="span"
                  sx={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor:
                      currentRecIndex === index ? "primary.main" : "grey.400",
                    mx: 0.5,
                    cursor: "pointer", // Add pointer cursor
                  }}
                  onClick={() => handleIndexChange(index)} // Allow clicking dots
                />
              ))}
            </Box>
          )}
        </Box>
      ) : (
        // --- DESKTOP: Focused View (Content only changes when index changes) ---
        <Box sx={{ px: 2, pb: 2 }}>
          {" "}
          {/* Padding for desktop content */}
          {/* Render content for the current index */}
          {renderRecommendationContent(recommendations[currentRecIndex])}
        </Box>
      )}
    </Card>
  );
};

export default FoodRecommendations;
