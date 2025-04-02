import { Container, Stack, Typography } from "@mui/material";
import ReindexDashboard from "./ReindexDashboard.tsx";

export const SettingsPage = () => {
  // Call your reindexAllImages Cloud Function

  return (
    <Container sx={{ mt: 2 }}>
      <Stack gap={2}>
        <Typography textAlign="center" variant="h4">
          Settings
        </Typography>
        <ReindexDashboard />
      </Stack>
    </Container>
  );
};
