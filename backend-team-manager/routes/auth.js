const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ message: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = user;
        next();
    });
};

router.get("/check", verifyToken, (req, res) => {
    res.json({
        message: "Token is valid!",
        email: req.user.email,
        tokenValid: true,
    });
});

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res
            .status(400)
            .json({ error: "Email e password sono richiesti" });
    }

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
                message: "Login ha avuto successo!",
            });
        } else {
            res.status(401).json({ error: "Credenziali non valide" });
        }
    } catch (error) {
        console.error("Error reading users file:", error);
        res.status(500).json({ error: "Errore del server" });
    }
});

router.post("/logout", (req, res) => {
    res.json({ message: "Logout avvenuto con successo" });
});

module.exports = router;
