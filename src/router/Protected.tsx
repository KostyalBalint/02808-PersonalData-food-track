import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { CircularProgress, Box } from "@mui/material";

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();

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

  return user ? <Outlet /> : <Navigate to="/login" />;
};
