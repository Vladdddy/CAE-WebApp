const fs = require("fs");
const path = require("path");

const usersFilePath = path.join(__dirname, "..", "data", "users.json");

// Get all active employees from users.json
exports.getUsers = (req, res) => {
    try {
        if (!fs.existsSync(usersFilePath)) {
            return res.json([]);
        }

        const users = JSON.parse(fs.readFileSync(usersFilePath));
        // Filter for active users who should appear in shifts (employees, admins, managers)
        // Superuser is excluded from shifts as they are supervisor-only
        const shiftUsers = users.filter(
            (user) =>
                user.active &&
                (user.role === "employee" ||
                    user.role === "admin" ||
                    user.role === "manager")
        );

        res.json(shiftUsers);
    } catch (error) {
        console.error("Error reading users file:", error);
        res.status(500).json({ error: "Error reading users file" });
    }
};
