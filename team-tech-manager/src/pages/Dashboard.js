import "../styles/dashboard.css";
import Logo from "../assets/logo.png";
import { useState, useEffect } from "react";

export default function Dashboard() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const API = process.env.REACT_APP_API_URL;
    const today = new Date().toISOString().split("T")[0];

    // Aggiorna il tempo corrente ogni secondo
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Prende i task dal server
    useEffect(() => {
        fetch(`${API}/api/tasks`)
            .then((res) => res.json())
            .then((data) => {
                setTasks(data);
                setLoading(false);
            });
    }, []);

    // Funzioni per gestire i task
    const toggleTask = async (id) => {
        const res = await fetch(`${API}/api/tasks/${id}/toggle`, {
            method: "PATCH",
        });
        const updated = await res.json();
        setTasks(tasks.map((t) => (t.id === id ? updated : t)));
    };

    // Funzione per eliminare un task
    const deleteTask = async (id) => {
        if (!window.confirm("Confermi l'eliminazione del task?")) return;
        const res = await fetch(`${API}/api/tasks/${id}`, {
            method: "DELETE",
        });
        if (res.ok) {
            setTasks(tasks.filter((t) => t.id !== id));
        }
    };

    const getBorderColor = (status) => {
        switch (status) {
            case "completato":
                return "#139d5440";
            case "in corso":
                return "#f6ad1040";
            default:
                return "#e5e7eb40";
        }
    };

    const dailyTasks = tasks.filter((t) => t.date === today);

    // Filtra i task in base all'orario
    const dayTasks = dailyTasks.filter((task) => {
        const taskTime = task.time;
        const hour = parseInt(taskTime.split(":")[0]);
        return hour >= 7 && hour < 19;
    });

    const nightTasks = dailyTasks.filter((task) => {
        const taskTime = task.time;
        const hour = parseInt(taskTime.split(":")[0]);
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

    const getCurrentShiftEmployees = () => {
        const shift = getCurrentShift();
        const employees = {
            O: [
                "Marco Verdi",
                "Luca Rossi",
                "Andrea Bianchi",
                "Giulia Neri",
                "Sara Gialli",
            ],
            OP: [
                "Simone Neri",
                "Francesco Verde",
                "Alessandro Blu",
                "Elena Rosa",
            ],
            ON: ["Matteo Giallo", "Lorenzo Viola", "Davide Arancio"],
        };
        return employees[shift] || [];
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

    const renderTaskList = (taskList, shiftType) => {
        if (taskList.length === 0) {
            return (
                <div className="text-center py-2 text-gray-400 text-sm">
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
                    <div className=" text-xs text-gray-500">
                        {task.time} • {task.assignedTo} • {task.status}
                    </div>
                </div>
                <div className="buttons flex flex-row gap-2">
                    <button
                        onClick={() => toggleTask(task.id)}
                        title="Cambia stato"
                    >
                        <svg
                            className="finito-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            color={
                                task.status === "completato"
                                    ? "#139d54"
                                    : task.status === "in corso"
                                    ? "#f6ad10"
                                    : "#6b7280"
                            }
                            fill="none"
                        >
                            <path
                                d="M10.2892 21.9614H9.39111C6.14261 21.9614 4.51836 21.9614 3.50918 20.9363C2.5 19.9111 2.5 18.2612 2.5 14.9614V9.96139C2.5 6.66156 2.5 5.01165 3.50918 3.98653C4.51836 2.9614 6.14261 2.9614 9.39111 2.9614H12.3444C15.5929 2.9614 17.4907 3.01658 18.5 4.04171C19.5092 5.06683 19.5 6.66156 19.5 9.96139V11.1478"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></path>
                            <path
                                d="M15.9453 2V4M10.9453 2V4M5.94531 2V4"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></path>
                            <path
                                d="M7 15H11M7 10H15"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                            ></path>
                            <path
                                opacity="0.93"
                                d="M20.7598 14.8785C19.8544 13.8641 19.3112 13.9245 18.7076 14.1056C18.2851 14.166 16.8365 15.8568 16.2329 16.3952C15.2419 17.3743 14.2464 18.3823 14.1807 18.5138C13.9931 18.8188 13.8186 19.3592 13.7341 19.963C13.5771 20.8688 13.3507 21.8885 13.6375 21.9759C13.9242 22.0632 14.7239 21.8954 15.6293 21.7625C16.2329 21.6538 16.6554 21.533 16.9572 21.3519C17.3797 21.0983 18.1644 20.2046 19.5164 18.8761C20.3644 17.9833 21.1823 17.3664 21.4238 16.7626C21.6652 15.8568 21.3031 15.3737 20.7598 14.8785Z"
                                stroke="currentColor"
                                stroke-width="1.5"
                            ></path>
                        </svg>
                    </button>

                    <button
                        onClick={() => deleteTask(task.id)}
                        title="Elimina task"
                    >
                        <svg
                            className="elimina-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            color="#e53e3e"
                            fill="none"
                        >
                            <path
                                d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 18.0008 20.2879C17.6833 20.7431 17.2747 21.1273 16.8007 21.416C15.8421 22 14.559 22 11.9927 22C9.42312 22 8.1383 22 7.17905 21.4149C6.7048 21.1257 6.296 20.7408 5.97868 20.2848C5.33688 19.3626 5.25945 18.0801 5.10461 15.5152L4.5 5.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            ></path>
                            <path
                                d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            ></path>
                        </svg>
                    </button>
                </div>
            </div>
        ));
    };

    return (
        <>
            {" "}
            <div className="top-dashboard flex justify-between items-center p-4 text-gray-800">
                <h1 className="text-2xl font-bold">Benvenuto User</h1>{" "}
                <div className="date-time-display px-4 py-2">
                    <div className="flex flex-col justify-center items-center gap-1">
                        <div className="text-xl text-[#3b82f6] bg-[#3b82f620] py-2 px-4 rounded-md">
                            {currentTime.toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </div>
                        <div className="text-xs font-semibold text-gray-600">
                            {currentTime.toLocaleDateString("it-IT", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-center">
                <img src={Logo} alt="Company Logo" className="h-16 w-auto" />
            </div>
            <div className="dashboard-content flex justify-between gap-4 p-4 mt-16">
                <div className="tasks border p-4 rounded-xl bg-white w-1/2 max-h-96 overflow-y-auto pb-4">
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
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                ></path>
                                <path
                                    d="M13 21.998C12.031 20.8176 10.5 18 8.5 18C7.20975 18.1059 6.53573 19.3611 5.84827 20.3287M5.84827 20.3287C5.45174 19.961 5.30251 19.4126 5.00406 18.3158L3.26022 11.9074C2.5584 9.32827 2.20749 8.0387 2.80316 7.02278C3.39882 6.00686 4.70843 5.66132 7.32766 4.97025L9.5 4.39708M5.84827 20.3287C6.2448 20.6965 6.80966 20.8103 7.9394 21.0379L12.0813 21.8725C12.9642 22.0504 12.9721 22.0502 13.8426 21.8205L16.6723 21.0739C19.2916 20.3828 20.6012 20.0373 21.1968 19.0214C21.7925 18.0055 21.4416 16.7159 20.7398 14.1368L19.0029 7.75375C18.301 5.17462 17.9501 3.88506 16.9184 3.29851C16.0196 2.78752 14.9098 2.98396 12.907 3.5"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    stroke-width="1.5"
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
                        <div className="text-center py-4 text-gray-500">
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
                                            stroke-width="1.5"
                                        ></path>
                                        <path
                                            d="M12 2V3.5M12 20.5V22M19.0708 19.0713L18.0101 18.0106M5.98926 5.98926L4.9286 4.9286M22 12H20.5M3.5 12H2M19.0713 4.92871L18.0106 5.98937M5.98975 18.0107L4.92909 19.0714"
                                            stroke="oklch(44.6% 0.03 256.802)"
                                            stroke-width="1.5"
                                            stroke-linecap="round"
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
                                            stroke-width="1.5"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
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
                <div className="employees border p-4 rounded-xl bg-white w-1/4 max-h-96 overflow-y-auto">
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
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></path>
                            <circle
                                cx="12"
                                cy="11"
                                r="2.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></circle>
                            <path
                                d="M17.5 11C18.6101 11 19.6415 11.3769 20.4974 12.0224C21.2229 12.5696 21.5 13.4951 21.5 14.4038V14.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></path>
                            <circle
                                cx="17.5"
                                cy="6.5"
                                r="2"
                                stroke="oklch(44.6% 0.03 256.802)"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></circle>
                            <path
                                d="M6.5 11C5.38987 11 4.35846 11.3769 3.50256 12.0224C2.77706 12.5696 2.5 13.4951 2.5 14.4038V14.5"
                                stroke="oklch(44.6% 0.03 256.802)"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            ></path>
                            <circle
                                cx="6.5"
                                cy="6.5"
                                r="2"
                                stroke="oklch(44.6% 0.03 256.802)"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
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
                                    stroke-width="1.5"
                                ></circle>
                                <path
                                    d="M12 8V12L14 14"
                                    stroke="oklch(44.6% 0.03 256.802)"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
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
        </>
    );
}
