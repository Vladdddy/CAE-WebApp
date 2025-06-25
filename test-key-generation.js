// Test script to verify the new key generation creates unique keys
// Run this with: node test-key-generation.js

// Helper function to generate consistent logbook note keys (copied from notesService.js)
const generateLogbookNoteKey = (entry) => {
    // Create a stable key that includes enough unique identifiers to distinguish entries
    const dateStr = (entry.date || "").replace(/[^0-9]/g, "");
    const timeStr = (entry.time || "").replace(/[^0-9]/g, "");
    const authorStr = (entry.author || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 15);

    // If entry has a persistent ID that's not random, use it
    if (
        entry.id &&
        typeof entry.id === "string" &&
        !entry.id.includes("Math.random")
    ) {
        return `logbook_entry_${entry.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }

    // Include additional stable identifiers to ensure uniqueness
    const titleStr = (entry.title || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 10);
    const simulatorStr = (entry.simulator || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 10);
    const categoryStr = (entry.category || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 8);

    // Create a simple hash from the initial text content to ensure uniqueness
    // This will be stable for the same entry even if text is edited later
    const initialTextHash = entry.text
        ? entry.text
              .split("")
              .reduce((hash, char) => {
                  return ((hash << 5) - hash + char.charCodeAt(0)) & 0xfffffff;
              }, 0)
              .toString(36)
        : "notxt";

    // Combine all stable identifiers to create a unique key
    return `logbook_${dateStr}_${timeStr}_${authorStr}_${titleStr}_${simulatorStr}_${categoryStr}_${initialTextHash}`;
};

const generatedKeys = new Set();
const duplicateKeys = [];

testEntries.forEach((entry, index) => {
    const key = generateLogbookNoteKey(entry);

    if (generatedKeys.has(key)) {
        duplicateKeys.push(key);
    } else {
        generatedKeys.add(key);
    }
});
