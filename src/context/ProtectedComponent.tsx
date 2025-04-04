import { Box, CircularProgress } from "@mui/material";
import { FC, PropsWithChildren } from "react";
import { useAuth } from "./AuthContext.tsx";
import { Role } from "../pages/pages.ts";

interface ProtectedComponentProps {
  allowedRoles?: Role[]; // Roles allowed to access this route
}

export const ProtectedComponent: FC<
  PropsWithChildren<ProtectedComponentProps>
> = ({ allowedRoles, children }) => {
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
    return null;
  }

  // If allowedRoles is defined, check if user's role is included
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    // Logged in, but not authorized for this route
    console.warn(
      `User role '${userProfile.role}' not authorized for path '${location.pathname}'. Allowed: ${allowedRoles.join(", ")}`,
    );
    return null;
  }

  return children;
};
