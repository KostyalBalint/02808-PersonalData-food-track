import {
  Card,
  CardHeader,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { ProtectedComponent } from "../context/ProtectedComponent.tsx";
import FoodRecommendations from "../components/FoodRecommendations.tsx";
import FeatureFlagGuard from "../components/FeatureFlags/FeatureFlagGuard.tsx";
import { UserFoodPyramid } from "../components/FoodPyramid/UserFoodPyramid.tsx";

export const HomePage = () => {
  const { userProfile } = useAuth();

  return (
    <Container sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title={
                <Stack direction="row" gap={2} alignItems={"center"}>
                  Hi, {userProfile?.displayName}
                  <Chip label={userProfile?.role} />
                </Stack>
              }
            ></CardHeader>
          </Card>
        </Grid>
        <FeatureFlagGuard flagKey="why-home-empty-inform">
          <Grid size={{ xs: 12 }}>
            <Card sx={{ width: "100%" }}>
              <CardHeader title="Why is this page empty?" />
              <Typography
                p={2}
                variant="body2"
                color="text.secondary"
                gutterBottom
                sx={{ width: "100%" }}
              >
                We have features coming up here. As the experiment progresses,
                you can access more features here.
              </Typography>
            </Card>
          </Grid>
        </FeatureFlagGuard>
        <ProtectedComponent allowedRoles={["SUBJECT", "ADMIN"]}>
          <Grid size={{ xs: 12 }}>
            <FeatureFlagGuard flagKey="food-pyramid">
              <UserFoodPyramid />
            </FeatureFlagGuard>
          </Grid>
        </ProtectedComponent>
        <ProtectedComponent allowedRoles={["SUBJECT", "ADMIN"]}>
          <Grid size={{ xs: 12 }}>
            <FeatureFlagGuard flagKey="meal-recommendations">
              <FoodRecommendations />
            </FeatureFlagGuard>
          </Grid>
        </ProtectedComponent>
      </Grid>
    </Container>
  );
};
