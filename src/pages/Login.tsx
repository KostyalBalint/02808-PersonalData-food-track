import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebaseConfig";
import {
  Button,
  Typography,
  Container,
  Box,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";

export const Login = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box textAlign="center" mt={5}>
        <Typography variant="h4" gutterBottom>
          Login
        </Typography>
        <Button variant="contained" color="primary" onClick={handleLogin}>
          Sign in with Google
        </Button>
      </Box>
    </Container>
  );
};
