const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const app = express();
const cors = require("cors");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY;

app.use(express.json());

app.use(
    cors({
        origin: process.env.REACT_APP_API_URL,
        credentials: true,
    })
);

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

// Login check
app.get("/", (req, res) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) return res.status(401).json({ message: "Missing token" });

    const token = authHeader.split(" ")[1];

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid token" });

        res.json({
            message: "Devi accedere alla rotta per continuare!",
            email: user.email,
            tokenValid: true,
        });
    });
});

// Autenticazione login
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    try {
        // Load users from JSON file
        const usersPath = path.join(__dirname, "../data/users.json");
        const usersData = fs.readFileSync(usersPath, "utf8");
        const users = JSON.parse(usersData);

        // Find user by email and password
        const user = users.find(
            (u) => u.email === email && u.password === password && u.active
        );

        if (user) {
            const token = jwt.sign(
                {
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    department: user.department,
                    id: user.id,
                },
                SECRET_KEY,
                { expiresIn: "20h" }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    department: user.department,
                },
            });
        } else {
            res.status(401).json({ error: "Credenziali non valide" });
        }
    } catch (error) {
        console.error("Error reading users file:", error);
        res.status(500).json({ error: "Errore del server" });
    }
});
