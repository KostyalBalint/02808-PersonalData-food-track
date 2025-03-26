import { Button, Container, Paper, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { functions } from "../firebaseConfig.ts";
import { httpsCallable } from "firebase/functions";

export const SettingsPage = () => {
  // Call your reindexAllImages Cloud Function

  const [loading, setLoading] = useState(false);

  const reindexImages = httpsCallable(functions, "addMessage");

  const { enqueueSnackbar } = useSnackbar();

  const handleClick = async () => {
    try {
      setLoading(true);
      enqueueSnackbar("Reindexing images", { variant: "info" });
      const result = await reindexImages();
      enqueueSnackbar((result.data as any).message, { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Error reindexing images", { variant: "error" });
    }
    setLoading(false);
  };

  return (
    <Container sx={{ mt: 2 }}>
      <Typography textAlign="center" variant="h4">
        Settings
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">Reindex all images</Typography>
        <Button onClick={handleClick} loading={loading}>
          Reindex
        </Button>
      </Paper>
    </Container>
  );
};
