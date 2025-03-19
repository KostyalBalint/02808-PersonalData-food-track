import { useState } from "react";
import {
    alpha,
    BottomNavigation, BottomNavigationAction,
    Box,
    Divider,
    Drawer,

    ListItem,
    ListItemButton,
    ListItemText, Paper,
    Stack,

    Typography,
} from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { pages } from "../pages/pages.ts";
import { LogoText } from "./LogoText.tsx";
import { IoLogOutOutline } from "react-icons/io5";

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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const drawerContent = (
    <Stack gap={1} p={2} height="100%">
      <LogoText variant="h6" textAlign="center" />
      {pages.map((page) => {
        const active = location.pathname === page.path;
        return (
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
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
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
        );
      })}

      <Divider sx={{ flexGrow: 1 }} />
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
    <Box sx={{ display: "flex" }}>
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
      <Box sx={{ height: "100dvh", width: "100%", display: "flex", direction:"column" }}>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            mt: {
              xs: 8,
              md: 0,
            },
          }}
        >
          {/*The main app content*/}
          <Outlet />
        </Box>
      </Box>
        <Paper
            sx={{display: { xs: "block", md: "none" },
                position: "fixed", bottom: 0, left: 0, right: 0 }} elevation={3}>

            <BottomNavigation
                showLabels
                onChange={(_, newValue) => {
                    navigate(pages[newValue].path);
                }}
                value={pages.findIndex((page) => location.pathname === page.path)}
            > {pages.map((page) => (
                <BottomNavigationAction label={page.name} icon={<page.icon />} />
            ))
            }
            </BottomNavigation>
        </Paper>
    </Box>
  );
};
