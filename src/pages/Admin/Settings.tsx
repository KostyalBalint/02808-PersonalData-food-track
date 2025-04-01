import { Container, Typography } from "@mui/material";
import ReindexImages from "./ImageReindexTool.tsx";

export const SettingsPage = () => {
  // Call your reindexAllImages Cloud Function

  return (
    <Container sx={{ mt: 2 }}>
      <Typography textAlign="center" variant="h4">
        Settings
      </Typography>

      <ReindexImages />
    </Container>
  );
};
