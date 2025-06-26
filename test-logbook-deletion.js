// Test script to simulate logbook entry deletion and verify notes are also deleted
const fs = require("fs");
const path = require("path");

const testLogbookNoteDeletion = () => {
    console.log("=== Improved Logbook Note Deletion Test ===\n");
    
    const notesPath = path.join(__dirname, "backend-team-manager", "data", "notes.json");
    
    // Read current state
    if (fs.existsSync(notesPath)) {
        const notesData = JSON.parse(fs.readFileSync(notesPath));
        console.log("Current logbook notes in notes.json:");
        Object.keys(notesData.logbookNotes || {}).forEach(entryId => {
            const notes = notesData.logbookNotes[entryId];
            console.log(`  ${entryId}: ${notes.length} notes`);
        });
        
        // Test the new matching logic
        console.log(`\n=== Testing new matching approach ===`);
        
        // Helper function to check if a logbook entry still exists in the new entries
        const entryStillExists = (noteKey, newEntries, date) => {
            // Extract components from the note key to match against entries
            // Note keys typically contain date, time, author, title, simulator, category, etc.
            
            for (const entry of newEntries) {
                // Try to match based on multiple criteria
                const dateMatch = !date || noteKey.includes(date.replace(/-/g, ''));
                const timeMatch = !entry.time || noteKey.includes(entry.time.replace(':', ''));
                const authorMatch = !entry.author || noteKey.includes(entry.author.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15));
                const titleMatch = !entry.title || noteKey.includes(entry.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10));
                const simulatorMatch = !entry.simulator || noteKey.includes(entry.simulator.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10));
                
                // If most components match, consider the entry still exists
                const matchCount = [dateMatch, timeMatch, authorMatch, titleMatch, simulatorMatch].filter(Boolean).length;
                if (matchCount >= 3) {
                    return true;
                }
            }
            
            return false;
        };
        
        // Simulate having only one entry remaining (removing the others)
        const mockNewEntries = [
            {
                "text": "Descrizione della entry#1",
                "author": "Administrator",
                "category": "troubleshooting",
                "subcategory": "HW",
                "extraDetail": "SOUND",
                "simulator": "FTD",
                "date": "2025-06-25",
                "time": "08:00",
                "duration": "3",
                "title": "Entry#1"
            }
        ];
        
        // Find keys to delete for date 2025-06-26
        const testDate = "2025-06-26";
        const keysToDelete = [];
        const dateStr = testDate.replace(/-/g, '');
        
        Object.keys(notesData.logbookNotes).forEach(noteKey => {
            // Only check notes for this specific date
            if (noteKey.includes(`logbook_${dateStr}_`)) {
                // Check if this note key still has a corresponding entry
                if (!entryStillExists(noteKey, [], testDate)) { // Empty array means all entries deleted
                    keysToDelete.push(noteKey);
                }
            }
        });
        
        console.log(`Keys that would be deleted for ${testDate}:`, keysToDelete);
        
        // Simulate the deletion logic from logbookController
        const deleteLogbookNotes = (entryKeys) => {
            try {
                if (fs.existsSync(notesPath)) {
                    const notesData = JSON.parse(fs.readFileSync(notesPath));
                    
                    let deletedCount = 0;
                    entryKeys.forEach(entryKey => {
                        if (notesData.logbookNotes && notesData.logbookNotes[entryKey]) {
                            delete notesData.logbookNotes[entryKey];
                            deletedCount++;
                            console.log(`✅ Deleted notes for logbook entry: ${entryKey}`);
                        }
                    });
                    
                    if (deletedCount > 0) {
                        fs.writeFileSync(notesPath, JSON.stringify(notesData, null, 2));
                        console.log(`Total logbook notes deleted: ${deletedCount}`);
                    }
                    
                    return deletedCount;
                }
                return 0;
            } catch (error) {
                console.error(`❌ Error deleting logbook notes:`, error);
                return 0;
            }
        };
        
        // Test deleting notes for the test keys
        if (keysToDelete.length > 0) {
            const result = deleteLogbookNotes(keysToDelete);
            
            // Show the result
            if (fs.existsSync(notesPath)) {
                const notesData = JSON.parse(fs.readFileSync(notesPath));
                console.log("\nAfter deletion - remaining logbook notes:");
                Object.keys(notesData.logbookNotes || {}).forEach(entryId => {
                    const notes = notesData.logbookNotes[entryId];
                    console.log(`  ${entryId}: ${notes.length} notes`);
                });
            }
        } else {
            console.log("No keys found to delete for the test date");
        }
    } else {
        console.log("Notes file doesn't exist yet");
    }
};

testLogbookNoteDeletion();
