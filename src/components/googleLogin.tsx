import { signInWithPopup } from "firebase/auth";
import { Box, Button, Container, Typography } from "@mui/material";
import { auth, provider } from "../firebaseConfig.ts";

export const GoogleLogin = () => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("User Info:", result.user);
      alert(`Welcome, ${result.user.displayName}!`);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box textAlign="center" mt={5}>
        <Typography variant="h4" gutterBottom>
          Login with Google
        </Typography>
        <Button variant="contained" color="primary" onClick={handleLogin}>
          Sign in with Google
        </Button>
      </Box>
    </Container>
  );
};
