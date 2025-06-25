// Test script to verify that note key generation produces unique keys
// and doesn't create problematic generic keys

// Mock entry generator similar to what would be created in the frontend
const generateTestEntries = () => {
    return [
        {
            date: "2025-06-25",
            time: "08:00",
            author: "Administrator",
            title: "",
            simulator: "",
            category: "",
            text: "New entry with minimal info",
        },
        {
            date: "2025-06-25",
            time: "08:00",
            author: "Administrator",
            title: "Test Entry",
            simulator: "FTD",
            category: "routine",
            text: "Test entry with full info",
        },
        {
            date: "2025-06-25",
            time: "08:00",
            author: "Administrator",
            title: "",
            simulator: "",
            category: "",
            text: "",
        },
    ];
};

// Simplified key generation logic (copied from notesService.js)
const generateLogbookNoteKey = (entry) => {
    const dateStr = (entry.date || "").replace(/[^0-9]/g, "");
    const timeStr = (entry.time || "").replace(/[^0-9]/g, "");
    const authorStr = (entry.author || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 15);

    if (
        entry.id &&
        typeof entry.id === "string" &&
        !entry.id.includes("Math.random")
    ) {
        return `logbook_entry_${entry.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }

    const titleStr = (entry.title || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 10);
    const simulatorStr = (entry.simulator || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 10);
    const categoryStr = (entry.category || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 8);

    const initialTextHash = entry.text
        ? entry.text
              .split("")
              .reduce((hash, char) => {
                  return ((hash << 5) - hash + char.charCodeAt(0)) & 0xfffffff;
              }, 0)
              .toString(36)
        : "notxt";

    const key = `logbook_${dateStr}_${timeStr}_${authorStr}_${titleStr}_${simulatorStr}_${categoryStr}_${initialTextHash}`;

    // Validate that the key has enough identifying information
    const hasEnoughInfo =
        titleStr ||
        simulatorStr ||
        categoryStr ||
        (entry.text && entry.text.trim().length > 3);

    if (!hasEnoughInfo) {
        // Add a random component to ensure uniqueness for entries with minimal info
        const randomComponent = Math.random().toString(36).substring(2, 8);
        return `${key}_${randomComponent}`;
    }

    return key;
};

console.log("Testing note key generation...\n");

const testEntries = generateTestEntries();
const generatedKeys = [];

testEntries.forEach((entry, index) => {
    const key = generateLogbookNoteKey(entry);
    generatedKeys.push(key);

    console.log(`Entry ${index + 1}:`);
    console.log(
        `  Date: ${entry.date}, Time: ${entry.time}, Author: ${entry.author}`
    );
    console.log(
        `  Title: "${entry.title}", Simulator: "${entry.simulator}", Category: "${entry.category}"`
    );
    console.log(`  Text: "${entry.text}"`);
    console.log(`  Generated Key: ${key}`);

    // Check if key is too generic (problematic pattern)
    const isGeneric = /^logbook_\d+_\d+_[^_]+$/.test(key);
    if (isGeneric) {
        console.log(
            `  ❌ WARNING: Key is too generic and could cause conflicts!`
        );
    } else {
        console.log(`  ✅ Key is specific enough`);
    }
    console.log("");
});

// Check for duplicate keys
const uniqueKeys = new Set(generatedKeys);
if (uniqueKeys.size === generatedKeys.length) {
    console.log("✅ All generated keys are unique");
} else {
    console.log("❌ DUPLICATE KEYS FOUND!");
    console.log("Generated keys:", generatedKeys);
}

console.log("\nTest completed!");
