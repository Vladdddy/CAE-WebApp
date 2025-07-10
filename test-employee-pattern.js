// Test script to verify employee pattern logic
// Run with: node test-employee-pattern.js

// Employee pattern: D D D D R R N N N N R R (12-day cycle)
const employeePattern = [
    "O",
    "O",
    "O",
    "O",
    "R",
    "R",
    "ON",
    "ON",
    "ON",
    "ON",
    "R",
    "R",
];

function getDateKey(date) {
    return date.toLocaleDateString("en-CA"); // YYYY-MM-DD format in local time
}

function testEmployeePattern() {
    console.log("Testing Employee Pattern Application");
    console.log("Pattern:", employeePattern);
    console.log("Pattern length:", employeePattern.length, "days\n");

    // Test for July 2025 (month = 6, year = 2025)
    const year = 2025;
    const month = 6; // July (0-indexed)
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    console.log(
        `Testing for ${monthStart.toLocaleDateString()} to ${monthEnd.toLocaleDateString()}\n`
    );

    // Test 3 users to see offset behavior
    const testUsers = ["User1", "User2", "User3"];

    testUsers.forEach((userName, userIndex) => {
        console.log(`=== ${userName} (offset: ${userIndex * 4}) ===`);

        let currentDate = new Date(monthStart);
        let dayCounter = 0;
        let results = [];

        while (currentDate <= monthEnd) {
            const dateKey = getDateKey(currentDate);
            const dayOfWeek = currentDate.getDay();
            const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            // Calculate pattern index with user offset
            let userPatternIndex =
                (dayCounter + userIndex * 4) % employeePattern.length;
            let shiftToAssign = employeePattern[userPatternIndex];

            results.push({
                date: dateKey,
                day: dayNames[dayOfWeek],
                dayCounter,
                patternIndex: userPatternIndex,
                shift: shiftToAssign,
            });

            currentDate.setDate(currentDate.getDate() + 1);
            dayCounter++;
        }

        // Display first 20 days
        console.log("Date       Day  Counter Index Shift");
        console.log("---------- --- -------- ----- -----");
        results.slice(0, 20).forEach((r) => {
            console.log(
                `${r.date} ${r.day}     ${r.dayCounter
                    .toString()
                    .padStart(2)}     ${r.patternIndex
                    .toString()
                    .padStart(2)}    ${r.shift}`
            );
        });

        // Show pattern cycle completion
        console.log("\nPattern cycle analysis:");
        const cycleStart = results.slice(0, 12);
        const cycleRepeat = results.slice(12, 24);

        console.log("First cycle: ", cycleStart.map((r) => r.shift).join(" "));
        if (cycleRepeat.length >= 12) {
            console.log(
                "Second cycle:",
                cycleRepeat.map((r) => r.shift).join(" ")
            );

            const isRepeating = cycleStart.every(
                (day, i) => cycleRepeat[i] && day.shift === cycleRepeat[i].shift
            );
            console.log("Pattern repeats correctly:", isRepeating);
        }

        console.log("\n");
    });

    // Test that different users have different patterns on the same day
    console.log("=== User Offset Verification ===");
    console.log(
        "Checking first 10 days to ensure users have different shifts:\n"
    );

    console.log("Date       User1 User2 User3");
    console.log("---------- ----- ----- -----");

    for (let day = 0; day < 10; day++) {
        const date = new Date(monthStart);
        date.setDate(date.getDate() + day);
        const dateKey = getDateKey(date);

        const shifts = testUsers.map((userName, userIndex) => {
            const userPatternIndex =
                (day + userIndex * 4) % employeePattern.length;
            return employeePattern[userPatternIndex];
        });

        console.log(
            `${dateKey} ${shifts[0].padEnd(5)} ${shifts[1].padEnd(5)} ${
                shifts[2]
            }`
        );
    }
}

testEmployeePattern();
