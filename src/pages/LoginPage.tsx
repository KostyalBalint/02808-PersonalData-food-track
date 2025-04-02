import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebaseConfig";
import { Box, Button, CircularProgress, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import { LoginLayout } from "./layouts/LoginLayout.tsx";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext.tsx";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && currentUser) {
      navigate("/");
    }
  }, [currentUser, loading, navigate]);

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
        height="100dvh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LoginLayout>
      <Container maxWidth="md">
        <img src={logo} alt="" style={{ width: "100%" }} />
      </Container>
      <Button
        variant="outlined"
        color="info"
        onClick={handleLogin}
        startIcon={<FcGoogle />}
        sx={{ mt: 2 }}
      >
        Google
      </Button>
    </LoginLayout>
  );
};
