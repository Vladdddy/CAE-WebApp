import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/sidebar.css";

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            // Call the logout endpoint (optional - mainly for logging purposes)
            const token = localStorage.getItem("authToken");
            if (token) {
                await fetch("http://localhost:5000/api/auth/logout", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });
            }
        } catch (error) {
            console.error("Logout request failed:", error);
        } finally {
            // Remove token from localStorage regardless of API call success
            localStorage.removeItem("authToken");
            // Redirect to login page
            navigate("/login");
        }
    };

    return (
        <div className="sidebar-pc flex flex-col w-64 h-screen bg-gray-800 text-white p-4 fixed">
            <h2 className="flex justify-center align-items-center text-2xl font-bold mb-6">
                Simtech
            </h2>
            <ul className="flex flex-col gap-2 my-16 space-y-1">
                {" "}
                <li className="rounded">
                    <Link
                        to="/"
                        className={`flex align-items-center gap-2 p-2 hover:bg-gray-700 rounded ${
                            location.pathname === "/" ? "active-link" : ""
                        }`}
                    >
                        <svg
                            className="dashboard-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width=""
                            height=""
                            color=""
                            fill="none"
                        >
                            <path
                                d="M9.75 3H5.75C5.05222 3 4.70333 3 4.41943 3.08612C3.78023 3.28002 3.28002 3.78023 3.08612 4.41943C3 4.70333 3 5.05222 3 5.75C3 6.44778 3 6.79667 3.08612 7.08057C3.28002 7.71977 3.78023 8.21998 4.41943 8.41388C4.70333 8.5 5.05222 8.5 5.75 8.5H9.75C10.4478 8.5 10.7967 8.5 11.0806 8.41388C11.7198 8.21998 12.22 7.71977 12.4139 7.08057C12.5 6.79667 12.5 6.44778 12.5 5.75C12.5 5.05222 12.5 4.70333 12.4139 4.41943C12.22 3.78023 11.7198 3.28002 11.0806 3.08612C10.7967 3 10.4478 3 9.75 3Z"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            ></path>
                            <path
                                d="M21 9.75V5.75C21 5.05222 21 4.70333 20.9139 4.41943C20.72 3.78023 20.2198 3.28002 19.5806 3.08612C19.2967 3 18.9478 3 18.25 3C17.5522 3 17.2033 3 16.9194 3.08612C16.2802 3.28002 15.78 3.78023 15.5861 4.41943C15.5 4.70333 15.5 5.05222 15.5 5.75V9.75C15.5 10.4478 15.5 10.7967 15.5861 11.0806C15.78 11.7198 16.2802 12.22 16.9194 12.4139C17.2033 12.5 17.5522 12.5 18.25 12.5C18.9478 12.5 19.2967 12.5 19.5806 12.4139C20.2198 12.22 20.72 11.7198 20.9139 11.0806C21 10.7967 21 10.4478 21 9.75Z"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            ></path>
                            <path
                                d="M16.9194 20.9139C17.2033 21 17.5522 21 18.25 21C18.9478 21 19.2967 21 19.5806 20.9139C20.2198 20.72 20.72 20.2198 20.9139 19.5806C21 19.2967 21 18.9478 21 18.25C21 17.5522 21 17.2033 20.9139 16.9194C20.72 16.2802 20.2198 15.78 19.5806 15.5861C19.2967 15.5 18.9478 15.5 18.25 15.5C17.5522 15.5 17.2033 15.5 16.9194 15.5861C16.2802 15.78 15.78 16.2802 15.5861 16.9194C15.5 17.2033 15.5 17.5522 15.5 18.25C15.5 18.9478 15.5 19.2967 15.5861 19.5806C15.78 20.2198 16.2802 20.72 16.9194 20.9139Z"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            ></path>
                            <path
                                d="M8.5 11.5H7C5.11438 11.5 4.17157 11.5 3.58579 12.0858C3 12.6716 3 13.6144 3 15.5V17C3 18.8856 3 19.8284 3.58579 20.4142C4.17157 21 5.11438 21 7 21H8.5C10.3856 21 11.3284 21 11.9142 20.4142C12.5 19.8284 12.5 18.8856 12.5 17V15.5C12.5 13.6144 12.5 12.6716 11.9142 12.0858C11.3284 11.5 10.3856 11.5 8.5 11.5Z"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            ></path>
                        </svg>
                        <p className="text-l">Dashboard</p>
                    </Link>
                </li>{" "}
                <li>
                    <Link
                        to="/tasks"
                        className={`flex align-items-center gap-2 p-2 hover:bg-gray-700 rounded ${
                            location.pathname === "/tasks" ? "active-link" : ""
                        }`}
                    >
                        <svg
                            className="dashboard-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width=""
                            height=""
                            color=""
                            fill="none"
                        >
                            <path
                                d="M7.99805 16H11.998M7.99805 11H15.998"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            ></path>
                            <path
                                d="M7.5 3.5C5.9442 3.54667 5.01661 3.71984 4.37477 4.36227C3.49609 5.24177 3.49609 6.6573 3.49609 9.48836L3.49609 15.9944C3.49609 18.8255 3.49609 20.241 4.37477 21.1205C5.25345 22 6.66767 22 9.49609 22L14.4961 22C17.3245 22 18.7387 22 19.6174 21.1205C20.4961 20.241 20.4961 18.8255 20.4961 15.9944V9.48836C20.4961 6.6573 20.4961 5.24177 19.6174 4.36228C18.9756 3.71984 18.048 3.54667 16.4922 3.5"
                                stroke=""
                                strokeWidth="1.5"
                            ></path>
                            <path
                                d="M7.49609 3.75C7.49609 2.7835 8.2796 2 9.24609 2H14.7461C15.7126 2 16.4961 2.7835 16.4961 3.75C16.4961 4.7165 15.7126 5.5 14.7461 5.5H9.24609C8.2796 5.5 7.49609 4.7165 7.49609 3.75Z"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            ></path>
                        </svg>
                        <p className="text-l">Tasks</p>
                    </Link>
                </li>{" "}
                <li>
                    <Link
                        to="/logbook"
                        className={`flex align-items-center gap-2 p-2 hover:bg-gray-700 rounded ${
                            location.pathname === "/logbook"
                                ? "active-link"
                                : ""
                        }`}
                    >
                        <svg
                            className="dashboard-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width=""
                            height=""
                            color=""
                            fill="none"
                        >
                            <path
                                d="M20 22H6C4.89543 22 4 21.1046 4 20M4 20C4 18.8954 4.89543 18 6 18H20V6C20 4.11438 20 3.17157 19.4142 2.58579C18.8284 2 17.8856 2 16 2H10C7.17157 2 5.75736 2 4.87868 2.87868C4 3.75736 4 5.17157 4 8V20Z"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                            <path
                                d="M19.5 18C19.5 18 18.5 18.7628 18.5 20C18.5 21.2372 19.5 22 19.5 22"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                            <path
                                d="M9 2V10L12 7L15 10V2"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                        </svg>
                        <p className="text-l">Logbook</p>
                    </Link>
                </li>{" "}
                <li>
                    <Link
                        to="/shifts"
                        className={`flex align-items-center gap-2 p-2 hover:bg-gray-700 rounded ${
                            location.pathname === "/shifts" ? "active-link" : ""
                        }`}
                    >
                        <svg
                            className="dashboard-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width=""
                            height=""
                            color=""
                            fill="none"
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke=""
                                strokeWidth="1.5"
                            ></circle>
                            <path
                                d="M12 8V12L14 14"
                                stroke=""
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                        </svg>
                        <p className="text-l">Shifts</p>
                    </Link>
                </li>{" "}
            </ul>
            <button
                onClick={handleLogout}
                className="flex align-items-center gap-2 p-2 rounded mt-auto logout-btn hover:bg-gray-700 transition-colors text-left w-full"
            >
                <svg
                    className="dashboard-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width=""
                    height=""
                    color=""
                    fill="none"
                >
                    <path
                        d="M11 3L10.3374 3.23384C7.75867 4.144 6.46928 4.59908 5.73464 5.63742C5 6.67576 5 8.0431 5 10.7778V13.2222C5 15.9569 5 17.3242 5.73464 18.3626C6.46928 19.4009 7.75867 19.856 10.3374 20.7662L11 21"
                        stroke=""
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    ></path>
                    <path
                        d="M21 12L11 12M21 12C21 11.2998 19.0057 9.99153 18.5 9.5M21 12C21 12.7002 19.0057 14.0085 18.5 14.5"
                        stroke=""
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    ></path>
                </svg>
                <p className="text-l">Logout</p>
            </button>
        </div>
    );
}
