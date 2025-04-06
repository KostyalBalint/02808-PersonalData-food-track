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
import CacheBuster from "react-cache-buster";
import { version } from "../package.json";
import SafeArea from "./components/SafeArea.tsx";

function App() {
  return (
    <CacheBuster
      currentVersion={version}
      onCacheClear={() => {
        console.log("Cache cleared");
      }}
      isEnabled={true}
      isVerboseMode={false} //If true, the library writes verbose logs to console.
      metaFileDirectory={"."} //If public assets are hosted somewhere other than root on your server.
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SafeArea
          component="main" // Semantic HTML element, type-checked
          sx={{
            // sx prop is type-checked
            display: "flex",
            flexDirection: "column",
            minHeight: "100dvh", // Ensure it tries to fill viewport height
          }}
          // Example: Disable top padding if AppBar handles it
          // disableTop={true} // type-checked boolean
          // Example: Using theme spacing units (ensure it resolves to string/number)
        >
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
                          <Route
                            path={page.path}
                            element={<page.component />}
                          />
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
        </SafeArea>
      </ThemeProvider>
    </CacheBuster>
  );
}

export default App;
