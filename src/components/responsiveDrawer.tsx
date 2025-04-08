import { useState } from "react";
import {
  alpha,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Divider,
  Drawer,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { pages } from "../pages/pages.ts";
import { LogoText } from "./LogoText.tsx";
import { IoLogOutOutline } from "react-icons/io5";
import { useAuth } from "../context/AuthContext.tsx";
import { InstallPWAButton } from "./InstallPWAButton.tsx";
import FeatureFlagGuard from "./FeatureFlags/FeatureFlagGuard.tsx";
import { version } from "../../package.json";

const style = {
  minHeight: 44,
  borderRadius: 0.75,
  typography: "body2",
  color: "text.secondary",
  textTransform: "capitalize",
  fontWeight: "fontWeightMedium",
};

export const ResponsiveDrawer = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const { actualUserProfile } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const accessiblePages = pages
    .filter((page) => {
      if (!page.roles) return true; // Page accessible to all logged-in users if roles array is omitted/empty
      if (!actualUserProfile) return false; // Should not happen if ProtectedRoute works, but good check
      return page.roles.includes(actualUserProfile.role);
    })
    .filter((page) => page.path !== "/not-authorized"); // Don't show Not Authorized in menu

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const drawerContent = (
    <Stack gap={1} p={2} height="100%">
      <LogoText variant="h6" textAlign="center" />
      {accessiblePages.map((page) => {
        const active = location.pathname === page.path;
        const onlyAdminPage =
          page.roles?.length === 1 && page.roles[0] === "ADMIN";
        return (
          <FeatureFlagGuard flagKey={page.featureFlag} key={page.path}>
            <ListItem
              key={page.name}
              disablePadding
              onClick={() => {
                navigate(page.path);
              }}
            >
              <ListItemButton
                sx={{
                  ...style,
                  ...(active && {
                    fontWeight: "fontWeightSemiBold",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    "&:hover": {
                      bgcolor: (theme) =>
                        alpha(theme.palette.primary.main, 0.16),
                    },
                  }),

                  ...(onlyAdminPage && {
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.15),
                    "&:hover": {
                      bgcolor: (theme) =>
                        alpha(theme.palette.warning.main, 0.26),
                    },
                  }),
                }}
              >
                <Stack direction="row" gap={2} alignItems="center">
                  <Typography fontSize={22} lineHeight={0}>
                    <page.icon />
                  </Typography>
                  <ListItemText primary={page.name} />
                </Stack>
              </ListItemButton>
            </ListItem>
          </FeatureFlagGuard>
        );
      })}
      <Divider sx={{ flexGrow: 1 }} />
      <Typography
        variant="body2"
        color="text.secondary"
      >{`Version: ${version}`}</Typography>
      <InstallPWAButton />
      <ListItem onClick={handleLogout} disablePadding>
        <ListItemButton
          sx={{
            ...style,
          }}
        >
          <Stack direction="row" gap={2} alignItems="center">
            <Typography fontSize={22} lineHeight={0}>
              <IoLogOutOutline />
            </Typography>
            <ListItemText primary="Logout" />
          </Stack>
        </ListItemButton>
      </ListItem>
    </Stack>
  );

  return (
    <Box sx={{ display: "flex", width: "100wv" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": { width: 240, boxSizing: "border-box" },
        }}
        open
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: 240 },
        }}
      >
        {drawerContent}
      </Drawer>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          direction: "column",
        }}
      >
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            mb: {
              xs: 7,
              md: 0,
            },
            pb: 2,
            overflow: "scroll",
          }}
        >
          {/*The main app content*/}
          <Outlet />
        </Box>
      </Box>
      <Paper
        sx={{
          display: { xs: "block", md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
        }}
        elevation={3}
      >
        <BottomNavigation
          showLabels
          onChange={(_, newValue) => {
            navigate(newValue);
          }}
          value={location.pathname}
          sx={{
            backgroundColor: (theme) =>
              alpha(theme.palette.background.paper, 1),
            backdropFilter: "blur(8px)",
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            mb: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {accessiblePages
            .map((page) => (
              <BottomNavigationAction
                value={page.path}
                label={page.name}
                icon={<page.icon />}
              />
            ))
            .filter((page) => page)}
        </BottomNavigation>
      </Paper>
    </Box>
  );
};
