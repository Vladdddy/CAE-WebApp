const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const verifyToken = require("../middleware/auth");

const PATTERNS_FILE = path.join(__dirname, "../data/patterns.json");

// Get all custom patterns
router.get("/", verifyToken, async (req, res) => {
    try {
        const data = await fs.readFile(PATTERNS_FILE, "utf8");
        const patterns = JSON.parse(data);
        res.json(patterns);
    } catch (error) {
        if (error.code === "ENOENT") {
            // File doesn't exist, return empty array
            res.json([]);
        } else {
            console.error("Error reading patterns:", error);
            res.status(500).json({ error: "Failed to read patterns" });
        }
    }
});

// Create a new custom pattern
router.post("/", verifyToken, async (req, res) => {
    try {
        const newPattern = req.body;

        // Validate pattern data
        if (
            !newPattern.name ||
            !newPattern.pattern ||
            !Array.isArray(newPattern.pattern)
        ) {
            return res.status(400).json({ error: "Invalid pattern data" });
        }

        // Add ID and type if not present
        if (!newPattern.id) {
            newPattern.id = Date.now();
        }
        if (!newPattern.type) {
            newPattern.type = "custom";
        }

        // Read existing patterns
        let patterns = [];
        try {
            const data = await fs.readFile(PATTERNS_FILE, "utf8");
            patterns = JSON.parse(data);
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
            // File doesn't exist, start with empty array
        }

        // Add new pattern
        patterns.push(newPattern);

        // Save to file
        await fs.writeFile(PATTERNS_FILE, JSON.stringify(patterns, null, 2));

        res.status(201).json(newPattern);
    } catch (error) {
        console.error("Error creating pattern:", error);
        res.status(500).json({ error: "Failed to create pattern" });
    }
});

// Delete a custom pattern
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const patternId = parseInt(req.params.id);

        // Read existing patterns
        let patterns = [];
        try {
            const data = await fs.readFile(PATTERNS_FILE, "utf8");
            patterns = JSON.parse(data);
        } catch (error) {
            if (error.code === "ENOENT") {
                return res.status(404).json({ error: "Pattern not found" });
            }
            throw error;
        }

        // Find and remove pattern
        const patternIndex = patterns.findIndex((p) => p.id === patternId);
        if (patternIndex === -1) {
            return res.status(404).json({ error: "Pattern not found" });
        }

        patterns.splice(patternIndex, 1);

        // Save to file
        await fs.writeFile(PATTERNS_FILE, JSON.stringify(patterns, null, 2));

        res.json({ message: "Pattern deleted successfully" });
    } catch (error) {
        console.error("Error deleting pattern:", error);
        res.status(500).json({ error: "Failed to delete pattern" });
    }
});

module.exports = router;
