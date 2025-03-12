import { useState } from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { Home, Image, Logout, Menu, PhotoCamera } from "@mui/icons-material";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";

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
    <List>
      <ListItem
        component={Link}
        to="/home"
        onClick={() => setMobileOpen(false)}
      >
        <ListItemIcon>
          <Home />
        </ListItemIcon>
        <ListItemText primary="Home" />
      </ListItem>
      <ListItem
        component={Link}
        to="/camera"
        onClick={() => setMobileOpen(false)}
      >
        <ListItemIcon>
          <PhotoCamera />
        </ListItemIcon>
        <ListItemText primary="Camera" />
      </ListItem>
      <ListItem
        component={Link}
        to="/gallery"
        onClick={() => setMobileOpen(false)}
      >
        <ListItemIcon>
          <Image />
        </ListItemIcon>
        <ListItemText primary="Gallery" />
      </ListItem>
      <ListItem onClick={handleLogout}>
        <ListItemIcon>
          <Logout />
        </ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItem>
    </List>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap>
            Food Tracker App
          </Typography>
        </Toolbar>
      </AppBar>
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
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {/*The main app content*/}
        <Outlet />
      </Box>
    </Box>
  );
};
