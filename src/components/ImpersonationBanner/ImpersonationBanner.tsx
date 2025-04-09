// src/components/ImpersonationBanner/ImpersonationBanner.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Chip,
} from "@mui/material";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import { useAuth } from "../../context/AuthContext"; // Adjust path as needed

const ImpersonationBanner: React.FC = () => {
  const {
    isImpersonating,
    stopImpersonation,
    actualUserProfile, // The admin user
    userProfile, // The effectively displayed user (the one being impersonated)
  } = useAuth();

  // Don't render anything if not impersonating
  if (!isImpersonating || !actualUserProfile || !userProfile) {
    return null;
  }

  const adminName =
    actualUserProfile.displayName || actualUserProfile.email || "Admin";
  const impersonatedName =
    userProfile.displayName ||
    userProfile.email ||
    `User ${userProfile.uid.substring(0, 6)}...`;

  return (
    <AppBar
      position="sticky" // Or "fixed" - sticky stays at top when scrolling within container
      color="warning" // Use a distinct color like warning or secondary
      sx={{ top: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }} // Ensure it's above most content
    >
      <Container maxWidth="xl">
        {" "}
        {/* Use Container for consistent padding */}
        <Toolbar disableGutters sx={{ minHeight: { xs: 48 } }}>
          {" "}
          {/* disableGutters removes default padding */}
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <SupervisorAccountIcon sx={{ mr: 1 }} />
            <Typography variant="body2" component="div" sx={{ mr: 2 }}>
              Admin: <strong>{adminName}</strong>
            </Typography>
            <Chip
              icon={<AccountCircleIcon />}
              label={
                <span>
                  Impersonating: <strong>{impersonatedName}</strong>
                </span>
              }
              size="small"
              color="default" // Or contrast color
              variant="filled"
            />
          </Box>
          <Button
            color="inherit" // Use inherit to match AppBar text color
            variant="outlined" // Make it stand out slightly
            size="small"
            startIcon={<ExitToAppIcon />}
            onClick={stopImpersonation}
            sx={{
              borderColor: "rgba(0, 0, 0, 0.23)",
              "&:hover": { borderColor: "rgba(0, 0, 0, 0.5)" },
            }} // Adjust border for visibility
          >
            Stop Impersonating
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default ImpersonationBanner;
