import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage.tsx";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./router/Protected.tsx";
import { ResponsiveDrawer } from "./components/responsiveDrawer.tsx";
import { SnackbarProvider } from "notistack";
import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "./theme/theme.ts";
import { pages } from "./pages/pages.ts";
import { Page404 } from "./pages/404Page.tsx";

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
                  {pages.map((page) => (
                    <Route path={page.path} element={<page.component />} />
                  ))}
                  <Route path="*" element={<Page404 />} />
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
