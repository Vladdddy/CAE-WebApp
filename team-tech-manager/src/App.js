import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Logbook from "./pages/Logbook";
import Shifts from "./pages/Shifts";
import "./App.css";

function App() {
    return (
        <Router>
            <div className="flex">
                <Sidebar />
                <div className="ml-64 p-6 w-full">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/logbook" element={<Logbook />} />
                        <Route path="/shifts" element={<Shifts />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
