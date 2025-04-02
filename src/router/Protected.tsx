import { Navigate, Outlet } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { Role } from "../pages/pages.ts";
import { FC } from "react";

interface ProtectedRouteProps {
  allowedRoles?: Role[]; // Roles allowed to access this route
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { currentUser, userProfile, loading } = useAuth();

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

  if (!currentUser) {
    // Not logged in, redirect to login page (preserve target path)
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is defined, check if user's role is included
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    // Logged in, but not authorized for this route
    console.warn(
      `User role '${userProfile.role}' not authorized for path '${location.pathname}'. Allowed: ${allowedRoles.join(", ")}`,
    );
    return <Navigate to="/not-authorized" replace />;
  }

  return <Outlet />;
};
