import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage.tsx";
import { ProtectedRoute } from "./router/Protected.tsx";
import { ResponsiveDrawer } from "./components/responsiveDrawer.tsx";
import { SnackbarProvider } from "notistack";
import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "./theme/theme.ts";
import { pages } from "./pages/pages.ts";
import { Page404 } from "./pages/404Page.tsx";
import { MealPage } from "./pages/MealPage.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { PWAInstallProvider } from "./context/PWAInstallContext.tsx";
import { InstallPWAPrompt } from "./components/InstallPWAPrompt.tsx";

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
        <PWAInstallProvider>
          <InstallPWAPrompt />
          <AuthProvider>
            <Router>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Routes */}

                <Route element={<ResponsiveDrawer />}>
                  {pages.map((page) => (
                    <Route
                      element={<ProtectedRoute allowedRoles={page.roles} />}
                      key={page.path}
                    >
                      <Route path={page.path} element={<page.component />} />
                    </Route>
                  ))}

                  <Route path="/meal/:id" element={<MealPage />} />
                  <Route path="*" element={<Page404 />} />
                </Route>

                {/* Default Route */}
                <Route path="*" element={<LoginPage />} />
              </Routes>
            </Router>
          </AuthProvider>
        </PWAInstallProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
