// src/pages/Login.tsx
import { signInWithPopup } from "firebase/auth";
import { Box, Button, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { auth, provider } from "../firebase/firebase.ts";

export const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect to /home if already logged in
  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate("/home"); // Redirect to home after login
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

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
