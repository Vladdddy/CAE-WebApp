import "../styles/dashboard.css";
import Logo from "../assets/logo.png";
import Modal from "../components/Modal";
import DescriptionModal from "../components/DescriptionModal";
import { useState, useEffect, useMemo } from "react";

export default function Dashboard() {
    const today = new Date().toISOString().split("T")[0];
    const token = localStorage.getItem("authToken");
    let userEmail = (localStorage.getItem("userEmail") || "Utente")[0];
    userEmail = userEmail.charAt(0).toUpperCase();

    // Aggiorna il tempo corrente ogni secondo
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Prende le info dell'utente dal token JWT
    const getCurrentUser = () => {
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload;
        } catch (error) {
            console.error("Error parsing token:", error);
            return null;
        }
    };
    const currentUser = useMemo(() => getCurrentUser(), [token]);

    // Fetcha le tasks dal server
    const API = process.env.REACT_APP_API_URL;
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`${API}/api/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setTasks(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching tasks:", error);
                setLoading(false);
            });
    }, []);

    // Fetcha tutti i dipendenti
    const [users, setUsers] = useState([]);
    useEffect(() => {
        fetch(`${API}/api/users`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                return res.json();
            })
            .then((data) => {
                setUsers(data);
            })
            .catch((error) => {
                console.error("Error fetching users:", error);
            });
    }, []);

    // Fetcha tutti i turni del mese corrente
    const [shifts, setShifts] = useState({});
    useEffect(() => {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");

        fetch(`${API}/api/shifts/${year}/${month}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                return res.json();
            })
            .then((data) => {
                setShifts(data);
            })
            .catch((error) => {
                console.error("Error fetching shifts:", error);
            });
    }, []);

    // Gestione dei modali
    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        type: "info",
        onConfirm: null,
        confirmText: "Conferma",
    });
    const closeModal = () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
    };

    // Imposta il colore del bordo in base allo stato del task
    const getBorderColor = (status) => {
        switch (status) {
            case "completato":
                return "#139d5420";
            case "in corso":
                return "#f6ad1020";
            case "non completato":
                return "#dc262620";
            default:
                return "#e5e7eb";
        }
    };

    // Filtra le task (prende le task di oggi)
    const dailyTasks = tasks.filter((t) => t.date === today);

    // Filtra i task incompleti
    const incompleteTasks = tasks.filter(
        (task) => task.status === "non completato"
    );

    // Prende le task del turno diurno
    const dayTasks = dailyTasks.filter((task) => {
        const hour = parseInt(task.time.split(":")[0]);
        return hour >= 7 && hour < 19;
    });
    const incompleteDayTasks = incompleteTasks.filter((task) => {
        const hour = parseInt(task.time.split(":")[0]);
        return hour >= 7 && hour < 19;
    });

    // Prende le task del turno notturno
    const nightTasks = dailyTasks.filter((task) => {
        const hour = parseInt(task.time.split(":")[0]);
        return hour >= 19 || hour < 7;
    });
    const incompleteNightTasks = incompleteTasks.filter((task) => {
        const hour = parseInt(task.time.split(":")[0]);
        return hour >= 19 || hour < 7;
    });

    // Filtra i turni in base all'orario
    const getCurrentShift = () => {
        const currentHour = currentTime.getHours();
        if (currentHour >= 7 && currentHour < 12) {
            return "O";
        } else if (currentHour >= 12 && currentHour < 19) {
            return "OP";
        } else {
            return "ON";
        }
    };
    const getShiftName = () => {
        const shift = getCurrentShift();

        const shiftNames = {
            O: "Mattino",
            OP: "Pomeriggio",
            ON: "Notte",
        };

        return shiftNames[shift];
    };

    const getCurrentShiftEmployees = () => {
        const shift = getCurrentShift();
        const today = new Date().toISOString().split("T")[0];

        if (shifts[today]) {
            const todayShifts = shifts[today];
            const employeesInShift = [];

            users.forEach((user) => {
                const userShiftData = todayShifts[user.name];
                if (userShiftData && userShiftData.shift === shift) {
                    employeesInShift.push(user.name);
                }
            });

            return employeesInShift;
        }

        return [];
    };

    const renderTaskList = (
        taskList,
        showDates = false,
        isIncompleteSection = false
    ) => {
        if (taskList.length === 0) {
            return (
                <div className="text-center py-2 text-gray-400 text-xs">
                    Nessun task per il turno
                </div>
            );
        }

        return taskList.map((task) => (
            <div
                key={task.id}
                className="display-task flex items-center justify-between dashboard-content p-3 rounded mt-3 bg-gray-100"
                style={{
                    border: `2px solid ${getBorderColor(task.status)}`,
                }}
            >
                <div className="task-info">
                    <p className="text-gray-600 max-w-md font-semibold text-sm">
                        {task.title}
                    </p>
                    <div className=" text-xs text-gray-500 capitalize">
                        {showDates && task.date !== today && (
                            <span>
                                {new Date(task.date).toLocaleDateString(
                                    "it-IT"
                                )}{" "}
                                •{" "}
                            </span>
                        )}
                        {task.time} • {task.assignedTo} • {task.status}
                    </div>
                </div>{" "}
            </div>
        ));
    };

    return (
        <>
            <div className="top-dashboard flex justify-between items-center px-4 text-gray-800">
                <div>
                    <h1 className="text-2xl font-bold">
                        Ciao {currentUser?.name}!
                    </h1>
                </div>
                <div className="flex justify-center">
                    <img
                        src={Logo}
                        alt="Company Logo"
                        className="h-16 w-auto"
                    />
                </div>
                <div className="date-time-display px-4 py-2">
                    <div className="flex flex-col justify-center items-center gap-1">
                        <div className="text-xl text-[#3b82f6] bg-[#3b82f620] py-2 px-4 rounded-md">
                            {currentTime.toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                            {currentTime.toLocaleDateString("it-IT", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div className="dashboard-content flex justify-between gap-4 p-4 mt-16 h-96">
                <div className="tasks border p-4 rounded-xl bg-white w-1/2 max-w-[30vw] max-h-full overflow-y-auto pb-4">
                    <div className="title flex flex-row items-center justify-between mb-4">
                        <div className="left-row title flex flex-row items-center gap-2 ">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="oklch(44.6% 0.03 256.802)"
                                fill="none"
                            >
                                <path
                                    d="M10.6119 5.00008L10.0851 7M12.2988 2.76313C12.713 3.49288 12.4672 4.42601 11.7499 4.84733C11.0326 5.26865 10.1153 5.01862 9.70118 4.28887C9.28703 3.55912 9.53281 2.62599 10.2501 2.20467C10.9674 1.78334 11.8847 2.03337 12.2988 2.76313Z"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                ></path>
                                <path
                                    d="M13 21.998C12.031 20.8176 10.5 18 8.5 18C7.20975 18.1059 6.53573 19.3611 5.84827 20.3287M5.84827 20.3287C5.45174 19.961 5.30251 19.4126 5.00406 18.3158L3.26022 11.9074C2.5584 9.32827 2.20749 8.0387 2.80316 7.02278C3.39882 6.00686 4.70843 5.66132 7.32766 4.97025L9.5 4.39708M5.84827 20.3287C6.2448 20.6965 6.80966 20.8103 7.9394 21.0379L12.0813 21.8725C12.9642 22.0504 12.9721 22.0502 13.8426 21.8205L16.6723 21.0739C19.2916 20.3828 20.6012 20.0373 21.1968 19.0214C21.7925 18.0055 21.4416 16.7159 20.7398 14.1368L19.0029 7.75375C18.301 5.17462 17.9501 3.88506 16.9184 3.29851C16.0196 2.78752 14.9098 2.98396 12.907 3.5"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                ></path>
                            </svg>
                            <p className="text-gray-600">Task giornaliere</p>
                        </div>
                    </div>

                    <div className="separator"></div>

                    {loading ? (
                        <div className="text-center py-4">
                            Caricamento task...
                        </div>
                    ) : dailyTasks.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                            Nessun task per oggi
                        </div>
                    ) : (
                        <div>
                            <div className="mb-6 mt-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        color="oklch(44.6% 0.03 256.802)"
                                        fill="none"
                                    >
                                        <path
                                            d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                        ></path>
                                        <path
                                            d="M12 2V3.5M12 20.5V22M19.0708 19.0713L18.0101 18.0106M5.98926 5.98926L4.9286 4.9286M22 12H20.5M3.5 12H2M19.0713 4.92871L18.0106 5.98937M5.98975 18.0107L4.92909 19.0714"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        ></path>
                                    </svg>
                                    <h4 className="text-gray-600">Giorno</h4>
                                    <span className="span">
                                        {dayTasks.length} task
                                    </span>
                                </div>
                                {renderTaskList(dayTasks, "Day")}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        color="oklch(44.6% 0.03 256.802)"
                                        fill="none"
                                    >
                                        <path
                                            d="M21.5 14.0784C20.3003 14.7189 18.9301 15.0821 17.4751 15.0821C12.7491 15.0821 8.91792 11.2509 8.91792 6.52485C8.91792 5.06986 9.28105 3.69968 9.92163 2.5C5.66765 3.49698 2.5 7.31513 2.5 11.8731C2.5 17.1899 6.8101 21.5 12.1269 21.5C16.6849 21.5 20.503 18.3324 21.5 14.0784Z"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        ></path>
                                    </svg>
                                    <h4 className="text-gray-600">Notte</h4>
                                    <span className="span">
                                        {nightTasks.length} task
                                    </span>
                                </div>
                                {renderTaskList(nightTasks, "Night")}
                            </div>
                        </div>
                    )}
                </div>{" "}
                <div className="tasks border p-4 rounded-xl bg-white w-1/2 max-w-[30vw] max-h-full overflow-y-auto pb-4">
                    <div className="title flex flex-row items-center justify-between mb-4">
                        <div className="left-row title flex flex-row items-center gap-2 ">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="oklch(44.6% 0.03 256.802)"
                                fill="none"
                            >
                                <path
                                    d="M12 2.00012C17.5228 2.00012 22 6.47727 22 12.0001C22 17.523 17.5228 22.0001 12 22.0001C6.47715 22.0001 2 17.523 2 12.0001M8.909 2.48699C7.9 2.8146 6.96135 3.29828 6.12153 3.90953M3.90943 6.12162C3.29806 6.9616 2.81432 7.90044 2.4867 8.90964"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M14.9994 15.0001L9 9.00012M9.00064 15.0001L15 9.00012"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>{" "}
                            <p className="text-gray-600">Task incomplete</p>
                        </div>
                    </div>

                    <div className="separator"></div>

                    {loading ? (
                        <div className="text-center py-4">
                            Caricamento task...
                        </div>
                    ) : incompleteTasks.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                            Nessun task incompleto per oggi
                        </div>
                    ) : (
                        <div>
                            <div className="mb-6 mt-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        color="oklch(44.6% 0.03 256.802)"
                                        fill="none"
                                    >
                                        <path
                                            d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                        ></path>
                                        <path
                                            d="M12 2V3.5M12 20.5V22M19.0708 19.0713L18.0101 18.0106M5.98926 5.98926L4.9286 4.9286M22 12H20.5M3.5 12H2M19.0713 4.92871L18.0106 5.98937M5.98975 18.0107L4.92909 19.0714"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        ></path>
                                    </svg>
                                    <h4 className="text-gray-600">Giorno</h4>
                                    <span className="span">
                                        {incompleteDayTasks.length} task
                                    </span>
                                </div>
                                {renderTaskList(
                                    incompleteDayTasks,
                                    "Day",
                                    true,
                                    true
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="20"
                                        height="20"
                                        color="oklch(44.6% 0.03 256.802)"
                                        fill="none"
                                    >
                                        <path
                                            d="M21.5 14.0784C20.3003 14.7189 18.9301 15.0821 17.4751 15.0821C12.7491 15.0821 8.91792 11.2509 8.91792 6.52485C8.91792 5.06986 9.28105 3.69968 9.92163 2.5C5.66765 3.49698 2.5 7.31513 2.5 11.8731C2.5 17.1899 6.8101 21.5 12.1269 21.5C16.6849 21.5 20.503 18.3324 21.5 14.0784Z"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        ></path>
                                    </svg>
                                    <h4 className="text-gray-600">Notte</h4>
                                    <span className="span">
                                        {incompleteNightTasks.length} task
                                    </span>
                                </div>
                                {renderTaskList(
                                    incompleteNightTasks,
                                    "Night",
                                    true,
                                    true
                                )}
                            </div>
                        </div>
                    )}
                </div>{" "}
                <div className="employees border p-4 rounded-xl bg-white w-1/4 max-h-full overflow-y-auto">
                    <div className="title flex flex-row items-center gap-2 mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            color="oklch(44.6% 0.03 256.802)"
                            fill="none"
                        >
                            <path
                                d="M7.5 19.5C7.5 18.5344 7.82853 17.5576 8.63092 17.0204C9.59321 16.3761 10.7524 16 12 16C13.2476 16 14.4068 16.3761 15.3691 17.0204C16.1715 17.5576 16.5 18.5344 16.5 19.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                            <circle
                                cx="12"
                                cy="11"
                                r="2.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></circle>
                            <path
                                d="M17.5 11C18.6101 11 19.6415 11.3769 20.4974 12.0224C21.2229 12.5696 21.5 13.4951 21.5 14.4038V14.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                            <circle
                                cx="17.5"
                                cy="6.5"
                                r="2"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></circle>
                            <path
                                d="M6.5 11C5.38987 11 4.35846 11.3769 3.50256 12.0224C2.77706 12.5696 2.5 13.4951 2.5 14.4038V14.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></path>
                            <circle
                                cx="6.5"
                                cy="6.5"
                                r="2"
                                stroke="oklch(44.6% 0.03 256.802)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            ></circle>
                        </svg>
                        <p className="text-gray-600">Dipendenti in turno</p>
                    </div>

                    <div className="separator"></div>

                    <div className="mb-4 mt-8">
                        <div className="flex items-center gap-2 mb-3">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="oklch(44.6% 0.03 256.802)"
                                fill="none"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                ></circle>
                                <path
                                    d="M12 8V12L14 14"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                ></path>
                            </svg>
                            <h4 className="text-gray-600">Turno</h4>
                            <span className="span">{getShiftName()}</span>
                        </div>
                    </div>

                    {getCurrentShiftEmployees().map((employee, index) => (
                        <div
                            key={index}
                            className="display-task dashboard-content p-4 border border-gray-200 rounded mt-4 bg-gray-100"
                        >
                            <p className="text-gray-600 text-sm max-w-md">
                                {employee}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <Modal
                isOpen={modal.isOpen}
                onClose={closeModal}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onConfirm={modal.onConfirm}
                confirmText={modal.confirmText}
            />
        </>
    );
}
