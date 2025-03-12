import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./router/Protected.tsx";
import { Camera } from "./pages/Camera.tsx";
import { Gallery } from "./pages/Gallery.tsx";
import { ResponsiveDrawer } from "./components/responsiveDrawer.tsx";

function App() {
  return (
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
  );
}

export default App;
