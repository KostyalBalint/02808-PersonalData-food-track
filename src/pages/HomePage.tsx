import { Button, Typography, Container, Box } from "@mui/material";
import { auth } from "../firebaseConfig.ts";
import { useAuth } from "../hooks/useAuth.tsx";

export const HomePage = () => {
  const handleLogout = () => {
    auth.signOut();
  };

  const { user } = useAuth();

  return (
    <Container maxWidth="sm">
      <Box textAlign="center" mt={5}>
        <Typography variant="h3">Welcome {user?.displayName}</Typography>
        <Button variant="contained" color="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </Box>
    </Container>
  );
};
