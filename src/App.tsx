import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./router/Protected.tsx";
import { Camera } from "./pages/Camera.tsx";
import { Gallery } from "./pages/Gallery.tsx";
import { ResponsiveDrawer } from "./components/responsiveDrawer.tsx";
import { SnackbarProvider } from "notistack";

function App() {
  return (
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
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<ResponsiveDrawer />}>
                <Route path="/home" element={<Home />} />
                <Route path="/camera" element={<Camera />} />
                <Route path="/gallery" element={<Gallery />} />
              </Route>
            </Route>

            {/* Default Route */}
            <Route path="*" element={<Login />} />
          </Routes>
        </Router>
      </AuthProvider>
    </SnackbarProvider>
  );
}

export default App;
