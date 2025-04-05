import { Container, Paper, Stack, Typography } from "@mui/material";
import ReindexDashboard from "./ReindexDashboard.tsx";
import TriggerRecommendationButton from "./TriggerRecommendationButton.tsx";
import { useSnackbar } from "notistack";

export const SettingsPage = () => {
  const { enqueueSnackbar } = useSnackbar();

  return (
    <Container sx={{ mt: 2 }}>
      <Stack gap={2}>
        <Typography textAlign="center" variant="h4">
          Settings
        </Typography>
        <ReindexDashboard />
        <Paper>
          <Typography variant="h5"></Typography>
          <TriggerRecommendationButton
            onError={(e) =>
              enqueueSnackbar({
                variant: "error",
                message: `Error: ${e}`,
              })
            }
            onSuccess={() =>
              enqueueSnackbar({
                variant: "success",
                message: "Recommendations generated successfully.",
              })
            }
          />
        </Paper>
      </Stack>
    </Container>
  );
};
