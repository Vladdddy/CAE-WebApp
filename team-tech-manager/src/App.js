import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
    Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Logbook from "./pages/Logbook";
import Shifts from "./pages/Shifts";
import Login from "./pages/Login";
import "./App.css";

function ProtectedRoute({ children }) {
    const token = localStorage.getItem("authToken");
    return token ? children : <Navigate to="/login" replace />;
}

function AppContent() {
    const location = useLocation();
    const isLoginPage = location.pathname === "/login";

    return (
        <div className="flex">
            {!isLoginPage && <Sidebar />}{" "}
            <div className={`p-6 w-full ${!isLoginPage ? "ml-64" : ""}`}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/home"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/tasks"
                        element={
                            <ProtectedRoute>
                                <Tasks />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/logbook"
                        element={
                            <ProtectedRoute>
                                <Logbook />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/shifts"
                        element={
                            <ProtectedRoute>
                                <Shifts />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
