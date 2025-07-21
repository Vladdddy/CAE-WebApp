const API = process.env.REACT_APP_API_URL;

// Get authentication token
const getAuthToken = () => localStorage.getItem("authToken");

// Get authentication headers
const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAuthToken()}`,
});

// Notes API service
export const notesService = {
    // Task notes operations
    async getTaskNotes() {
        try {
            const response = await fetch(`${API}/api/notes/tasks`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error("Failed to fetch task notes");
            }
            return response.json();
        } catch (error) {
            console.error(
                "Backend not available for loading task notes:",
                error.message
            );
            return {}; // Return empty object when backend is not available
        }
    },

    async getTaskNotesById(taskId) {
        const response = await fetch(`${API}/api/notes/tasks/${taskId}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error("Failed to fetch task notes");
        }
        return response.json();
    },

    async addTaskNote(taskId, text, author) {
        console.log("Adding task note:", { taskId, text, author });
        try {
            const response = await fetch(`${API}/api/notes/tasks/${taskId}`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ text, author }),
            });
            console.log("Response status:", response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to add task note:", errorText);
                throw new Error(
                    `Failed to add task note: ${response.status} - ${errorText}`
                );
            }
            return response.json();
        } catch (error) {
            // If backend is not available, show error but don't save to localStorage
            console.error("Backend not available:", error.message);
            throw new Error(
                "Backend server is not running. Please start the backend server to save notes."
            );
        }
    },

    // Logbook notes operations
    async getLogbookNotes() {
        try {
            const response = await fetch(`${API}/api/notes/logbook`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                throw new Error("Failed to fetch logbook notes");
            }
            return response.json();
        } catch (error) {
            console.error(
                "Backend not available for loading logbook notes:",
                error.message
            );
            return {}; // Return empty object when backend is not available
        }
    },

    async getLogbookNotesById(entryId) {
        const encodedEntryId = encodeURIComponent(entryId);
        const response = await fetch(
            `${API}/api/notes/logbook/${encodedEntryId}`,
            {
                headers: getAuthHeaders(),
            }
        );
        if (!response.ok) {
            throw new Error("Failed to fetch logbook notes");
        }
        return response.json();
    },

    async addLogbookNote(entryId, text, author) {
        console.log("Adding logbook note:", { entryId, text, author });
        try {
            const encodedEntryId = encodeURIComponent(entryId);
            const response = await fetch(
                `${API}/api/notes/logbook/${encodedEntryId}`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ text, author }),
                }
            );
            console.log("Response status:", response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to add logbook note:", errorText);
                throw new Error(
                    `Failed to add logbook note: ${response.status} - ${errorText}`
                );
            }
            return response.json();
        } catch (error) {
            // If backend is not available, show error but don't save to localStorage
            console.error("Backend not available:", error.message);
            throw new Error(
                "Backend server is not running. Please start the backend server to save notes."
            );
        }
    },

    // General note operations
    async updateNote(type, entryId, noteIndex, text) {
        const response = await fetch(
            `${API}/api/notes/${type}/${entryId}/${noteIndex}`,
            {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify({ text }),
            }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to update note");
        }
        return response.json();
    },

    async deleteNote(type, entryId, noteIndex) {
        const response = await fetch(
            `${API}/api/notes/${type}/${entryId}/${noteIndex}`,
            {
                method: "DELETE",
                headers: getAuthHeaders(),
            }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to delete note");
        }
        return response.json();
    },

    // Migration function
    async migrateFromLocalStorage(taskNotes, logbookNotes) {
        const response = await fetch(`${API}/api/notes/migrate`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ taskNotes, logbookNotes }),
        });
        if (!response.ok) {
            throw new Error("Failed to migrate notes");
        }
        return response.json();
    },
};

// Migration utility to move notes from localStorage to backend
export const migrateNotesFromLocalStorage = async () => {
    try {
        const taskNotes = JSON.parse(localStorage.getItem("taskNotes") || "{}");
        const logbookNotes = JSON.parse(
            localStorage.getItem("logbookNotes") || "{}"
        );

        if (
            Object.keys(taskNotes).length > 0 ||
            Object.keys(logbookNotes).length > 0
        ) {
            console.log("Migrating notes from localStorage to backend...");

            const result = await notesService.migrateFromLocalStorage(
                taskNotes,
                logbookNotes
            );

            console.log("Migration successful:", result);

            // Clear localStorage after successful migration
            localStorage.removeItem("taskNotes");
            localStorage.removeItem("logbookNotes");

            return result;
        }

        return { message: "No notes to migrate" };
    } catch (error) {
        console.error("Migration failed:", error);
        throw error;
    }
};

// Helper function to generate consistent logbook note keys
export const generateLogbookNoteKey = (entry) => {
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
        : "notxt"; // Combine all stable identifiers to create a unique key
    const key = `logbook_${dateStr}_${timeStr}_${authorStr}_${titleStr}_${simulatorStr}_${categoryStr}_${initialTextHash}`;

    // Validate that the key has enough identifying information
    // This prevents overly generic keys that could match multiple entries
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

// Helper function to generate old-style keys for backward compatibility
export const generateLegacyLogbookNoteKey = (entry, textContent) => {
    const dateStr = (entry.date || "").replace(/[^0-9]/g, "");
    const timeStr = (entry.time || "").replace(/[^0-9]/g, "");
    const authorStr = (entry.author || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 15);

    // For legacy compatibility, try the text-hash based format (more specific)
    const textHash = textContent
        ? textContent.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10)
        : "";
    const textBasedKey = `logbook_${dateStr}_${timeStr}_${authorStr}_${textHash}`;

    // DISABLED: Simple keys are too generic and cause notes to be shared between entries
    // Only return text-based keys that are more specific
    return { simpleKey: null, textBasedKey };
};

// Utility function to help migrate notes from old keys to new stable keys
export const migrateLogbookNoteKeys = (logbookNotes) => {
    const migratedNotes = {};
    const legacyKeyPattern = /^logbook_(\d+)_(\d+)_([^_]+)(?:_(.+))?$/;

    Object.keys(logbookNotes).forEach((oldKey) => {
        const match = oldKey.match(legacyKeyPattern);
        if (match) {
            // For now, keep the old keys as-is since we can't regenerate new keys
            // without the original entry data. The migration will happen when
            // notes are accessed/saved in the UI with the actual entry data.
            migratedNotes[oldKey] = logbookNotes[oldKey];
            console.log(`Keeping legacy key: ${oldKey}`);
        } else {
            // Keep non-legacy keys as-is
            migratedNotes[oldKey] = logbookNotes[oldKey];
        }
    });

    return migratedNotes;
};

// Function to migrate notes when we have the actual entry data
export const migrateNoteFromLegacyKey = async (entry, legacyNotes) => {
    if (!entry || !legacyNotes || Object.keys(legacyNotes).length === 0) {
        return null;
    }

    const newKey = generateLogbookNoteKey(entry);
    const { simpleKey, textBasedKey } = generateLegacyLogbookNoteKey(
        entry,
        entry.text
    ); // Look for notes under various legacy key formats
    let notesToMigrate = [];

    // Check all possible legacy key formats, skip null/undefined keys
    const possibleKeys = [simpleKey, textBasedKey].filter(
        (key) => key !== null && key !== undefined
    );

    for (const possibleKey of possibleKeys) {
        if (legacyNotes[possibleKey]) {
            notesToMigrate = [...notesToMigrate, ...legacyNotes[possibleKey]];
            console.log(
                `Found notes to migrate from ${possibleKey} to ${newKey}`
            );
        }
    }

    if (notesToMigrate.length > 0) {
        try {
            // Save notes under the new key
            for (const note of notesToMigrate) {
                await notesService.addLogbookNote(
                    newKey,
                    note.text,
                    note.author
                );
            }

            // Delete old keys (this would need backend support)
            console.log(
                `Successfully migrated ${notesToMigrate.length} notes to new key: ${newKey}`
            );
            return newKey;
        } catch (error) {
            console.error("Failed to migrate notes:", error);
            return null;
        }
    }

    return null;
};
