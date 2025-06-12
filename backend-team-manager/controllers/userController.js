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
        // Filter for active employees in Operations department
        const employees = users.filter(
            (user) =>
                user.active &&
                user.role === "employee" &&
                user.department === "Operations"
        );

        res.json(employees);
    } catch (error) {
        console.error("Error reading users file:", error);
        res.status(500).json({ error: "Error reading users file" });
    }
};
