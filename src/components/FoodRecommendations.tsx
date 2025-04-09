import React, { useEffect, useState } from "react";
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
  Card,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext.tsx";
import { RecommendationDoc } from "../../functions/src/constants.ts";
import { db } from "../firebaseConfig.ts"; // For formatting dates

const FoodRecommendations: React.FC = () => {
  const { userProfile: user, loading: authLoading } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationDoc[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        const recommendationsRef = collection(db, "recommendations");
        const q = query(
          recommendationsRef,
          where("userId", "==", userId),
          orderBy("createdAt", "desc"), // Show newest first
        );

        const querySnapshot = await getDocs(q);
        const fetchedDocs: RecommendationDoc[] = [];
        querySnapshot.forEach((doc) => {
          fetchedDocs.push({
            id: doc.id,
            ...doc.data(),
          } as RecommendationDoc); // Type assertion
        });
        setRecommendations(fetchedDocs);
        console.log("Fetched recommendations:", fetchedDocs);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError("Failed to load recommendations. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      if (user) {
        fetchRecommendations(user.uid);
      } else {
        // Handle case where user is not logged in
        setLoading(false);
        setRecommendations([]);
        // Optionally show a login prompt
      }
    }
  }, [user, authLoading]);

  const formatDate = (timestamp: Timestamp | undefined): string => {
    if (!timestamp) return "Unknown Date";
    // Check if it's a Firestore Timestamp object
    if (timestamp.toDate) {
      return format(timestamp.toDate(), "PPP"); // e.g., Jan 1st, 2024
    }
    // Handle potential plain date objects if needed (though Firestore returns Timestamps)
    if (timestamp instanceof Date) {
      return format(timestamp, "PPP");
    }
    console.warn("Received unexpected date format:", timestamp);
    return "Invalid Date";
  };

  if (authLoading || loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Alert severity="info">Please log in to view your recommendations.</Alert>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (recommendations.length === 0) {
    return (
      <Alert severity="info">
        No recommendations available yet. Check back later!
      </Alert>
    );
  }

  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom component="h2">
        Your Daily Food Recommendations
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Suggestions to help you diversify your diet based on your recent meals.
        New recommendations are generated daily.
      </Typography>
      <Divider sx={{ my: 2 }} />
      {recommendations.map((recDoc, index) => {
        // Add check for recDoc and id validity
        if (!recDoc || typeof recDoc.id !== "string" || recDoc.id === "") {
          console.error(
            "Skipping rendering recommendation due to missing/invalid id:",
            recDoc,
            "at index:",
            index,
          );
          return null;
        }

        return (
          // Use React.Fragment or Box as the keyed container
          <Box key={recDoc.id}>
            {" "}
            {/* Add margin bottom for spacing */}
            {/* Display the Date */}
            <Typography variant="h6" component="h3" gutterBottom>
              {formatDate(recDoc.createdAt)}
            </Typography>
            {/* Display the Suggestions List */}
            {recDoc.suggestions && recDoc.suggestions.length > 0 ? (
              <List dense sx={{ pl: { xs: 0, sm: 2 } }}>
                {" "}
                {/* Optional padding for list items */}
                {recDoc.suggestions.map((suggestion, sIndex) => (
                  // Use React.Fragment for list items if no extra styling needed
                  <React.Fragment key={`${recDoc.id}-sugg-${sIndex}`}>
                    <ListItem alignItems="flex-start" sx={{ pl: 0 }}>
                      {" "}
                      {/* Reset padding if needed */}
                      <ListItemText
                        primary={
                          <Typography
                            variant="subtitle1"
                            component="span"
                            fontWeight="bold"
                            color="text.primary" // Ensure good contrast
                          >
                            {suggestion.mealName}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {suggestion.reasoning}
                          </Typography>
                        }
                        sx={{ my: 0.5 }} // Add a little vertical space to list items
                      />
                    </ListItem>
                    {/* Add divider between suggestions within the same day */}
                    {sIndex < recDoc.suggestions.length - 1 && (
                      <Divider
                        variant="inset"
                        component="li"
                        sx={{ ml: { xs: 0, sm: 2 } }}
                      /> // Adjust divider inset
                    )}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              // Message if no suggestions for that specific day
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ pl: { xs: 0, sm: 2 } }}
              >
                No specific suggestions generated for this day.
              </Typography>
            )}
            {/* Add a Divider between different recommendation days, except for the last one */}
            {index < recommendations.length - 1 && <Divider sx={{ my: 3 }} />}
          </Box>
        );
      })}
    </Card>
  );
};

export default FoodRecommendations;
