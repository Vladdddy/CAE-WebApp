// Test script to verify date range generation

const getDateRange = (startDate, days) => {
    const dates = [];
    const start = new Date(startDate);

    for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date.toISOString().split("T")[0]);
    }

    return dates;
};

// Test with July 23, 2025
const testDate = "2025-07-23";
console.log("Testing date range generation:");
console.log("Start date:", testDate);
console.log("7 days:", getDateRange(testDate, 7));
console.log("14 days:", getDateRange(testDate, 14));
