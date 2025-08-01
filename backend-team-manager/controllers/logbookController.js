const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const notesFilePath = path.join(__dirname, "..", "data", "notes.json");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const getFilePath = (date) => path.join(dataDir, `${date}.json`);

// Helper function to delete notes for specific logbook entries
const deleteLogbookNotes = (entryKeys) => {
    try {
        if (fs.existsSync(notesFilePath)) {
            const notesData = JSON.parse(fs.readFileSync(notesFilePath));

            let deletedCount = 0;
            entryKeys.forEach((entryKey) => {
                if (
                    notesData.logbookNotes &&
                    notesData.logbookNotes[entryKey]
                ) {
                    delete notesData.logbookNotes[entryKey];
                    deletedCount++;
                }
            });

            if (deletedCount > 0) {
                fs.writeFileSync(
                    notesFilePath,
                    JSON.stringify(notesData, null, 2)
                );
            }

            return deletedCount;
        }
        return 0;
    } catch (error) {
        console.error(`Error deleting logbook notes:`, error);
        return 0;
    }
};

// Helper function to check if a logbook entry still exists in the new entries
const entryStillExists = (noteKey, newEntries, date) => {
    // Extract components from the note key to match against entries
    // Note keys typically contain date, time, author, title, simulator, category, etc.

    for (const entry of newEntries) {
        // Try to match based on multiple criteria
        const dateMatch = !date || noteKey.includes(date.replace(/-/g, ""));
        const timeMatch =
            !entry.time || noteKey.includes(entry.time.replace(":", ""));
        const authorMatch =
            !entry.author ||
            noteKey.includes(
                entry.author.replace(/[^a-zA-Z0-9]/g, "").substring(0, 15)
            );
        const titleMatch =
            !entry.title ||
            noteKey.includes(
                entry.title.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10)
            );
        const simulatorMatch =
            !entry.simulator ||
            noteKey.includes(
                entry.simulator.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10)
            );

        // If most components match, consider the entry still exists
        const matchCount = [
            dateMatch,
            timeMatch,
            authorMatch,
            titleMatch,
            simulatorMatch,
        ].filter(Boolean).length;
        if (matchCount >= 3) {
            return true;
        }
    }

    return false;
};

exports.getEntriesByDate = (req, res) => {
    const { date } = req.params;
    const filePath = getFilePath(date);

    if (!fs.existsSync(filePath)) {
        return res.json([]);
    }

    try {
        const rawData = fs.readFileSync(filePath);
        const entries = JSON.parse(rawData);
        res.json(entries);
    } catch (err) {
        console.error("Errore nella lettura del file:", err);
        res.status(500).json({
            error: "Errore nella lettura del file logbook",
        });
    }
};

exports.saveEntriesByDate = (req, res) => {
    const { date } = req.params;

    // Handle both FormData (with images) and regular JSON (without images)
    let newEntries;
    let images = [];

    if (req.body.entries) {
        // FormData submission - entries is a JSON string
        try {
            newEntries = JSON.parse(req.body.entries);
        } catch (error) {
            return res
                .status(400)
                .json({ error: "Invalid entries JSON format" });
        }

        // Handle uploaded images
        images = req.files
            ? req.files.map((file) => ({
                  filename: file.filename,
                  originalname: file.originalname,
                  path: file.path,
                  size: file.size,
                  uploadDate: new Date().toISOString(),
              }))
            : [];
    } else {
        // Regular JSON submission - entries are directly in req.body
        newEntries = req.body;
    }

    // If there are images, add them to the last entry (the newly created one)
    if (images.length > 0 && newEntries.length > 0) {
        // Add images to the last entry (assuming it's the newly created one)
        const lastEntryIndex = newEntries.length - 1;
        if (!newEntries[lastEntryIndex].images) {
            newEntries[lastEntryIndex].images = [];
        }
        newEntries[lastEntryIndex].images.push(...images);
    }

    const filePath = getFilePath(date);

    try {
        // Find logbook notes that should be deleted
        const keysToDelete = [];

        if (fs.existsSync(notesFilePath)) {
            const notesData = JSON.parse(fs.readFileSync(notesFilePath));

            if (notesData.logbookNotes) {
                // Check all existing logbook note keys for this date
                const dateStr = date.replace(/-/g, "");

                Object.keys(notesData.logbookNotes).forEach((noteKey) => {
                    // Only check notes for this specific date
                    if (noteKey.includes(`logbook_${dateStr}_`)) {
                        // Check if this note key still has a corresponding entry
                        if (!entryStillExists(noteKey, newEntries, date)) {
                            keysToDelete.push(noteKey);
                        }
                    }
                });
            }
        }

        // Delete notes for removed entries
        if (keysToDelete.length > 0) {
            deleteLogbookNotes(keysToDelete);
        }

        // Save the new entries
        fs.writeFileSync(filePath, JSON.stringify(newEntries, null, 2));
        res.status(200).json({
            message: "Entries salvate con successo",
            deletedNotes: keysToDelete.length,
            imagesUploaded: images.length,
        });
    } catch (err) {
        console.error("Errore nel salvataggio:", err);
        res.status(500).json({ error: "Errore nel salvataggio del logbook" });
    }
};
