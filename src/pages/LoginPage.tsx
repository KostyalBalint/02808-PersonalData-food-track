import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebaseConfig";
import { Box, Button, CircularProgress, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { FcGoogle } from "react-icons/fc";
import { LoginLayout } from "./layouts/LoginLayout.tsx";

export const LoginPage = () => {
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
    <LoginLayout>
      <Container maxWidth="sm">
        <img src="./login_img.png" alt="" style={{ width: "100%" }} />
      </Container>
      <Button
        variant="outlined"
        onClick={handleLogin}
        startIcon={<FcGoogle />}
        sx={{ mt: 2 }}
      >
        Google
      </Button>
    </LoginLayout>
  );
};
