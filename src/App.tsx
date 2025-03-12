import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./router/Protected.tsx";
import { CameraPage } from "./pages/CameraPage.tsx";
import { GalleryPage } from "./pages/GalleryPage.tsx";
import { ResponsiveDrawer } from "./components/responsiveDrawer.tsx";
import { SnackbarProvider } from "notistack";
import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "./theme/theme.ts";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        autoHideDuration={3000}
      >
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<ResponsiveDrawer />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/camera" element={<CameraPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                </Route>
              </Route>

              {/* Default Route */}
              <Route path="*" element={<LoginPage />} />
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
