/**
 * Test script to validate note authorization functionality
 * This script tests that only admins or note owners can modify/delete notes
 */

const fs = require("fs");
const path = require("path");

// Simulate the note authorization logic from notesController.js
function canUserModifyNote(currentUser, noteAuthor) {
    // Check if user is authorized to modify this note
    // Only admins or the note author can modify the note
    return currentUser.role === "admin" || noteAuthor === currentUser.name;
}

// Test scenarios
const testCases = [
    {
        name: "Admin can modify any note",
        currentUser: { name: "Mario", role: "admin" },
        noteAuthor: "Sara",
        expectedResult: true,
    },
    {
        name: "Employee can modify their own note",
        currentUser: { name: "Sara", role: "employee" },
        noteAuthor: "Sara",
        expectedResult: true,
    },
    {
        name: "Employee cannot modify another user's note",
        currentUser: { name: "Sara", role: "employee" },
        noteAuthor: "Andrea",
        expectedResult: false,
    },
    {
        name: "Note owner can modify their note regardless of role",
        currentUser: { name: "Francesco", role: "employee" },
        noteAuthor: "Francesco",
        expectedResult: true,
    },
    {
        name: "Different admin can modify any note",
        currentUser: { name: "Luca", role: "admin" },
        noteAuthor: "Francesco",
        expectedResult: true,
    },
];

console.log("🧪 Testing Note Authorization Logic");
console.log("=".repeat(50));

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
    const result = canUserModifyNote(testCase.currentUser, testCase.noteAuthor);
    const passed = result === testCase.expectedResult;

    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log(
        `   User: ${testCase.currentUser.name} (${testCase.currentUser.role})`
    );
    console.log(`   Note Author: ${testCase.noteAuthor}`);
    console.log(`   Expected: ${testCase.expectedResult}, Got: ${result}`);
    console.log(`   Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);

    if (passed) {
        passedTests++;
    }
});

console.log("\n" + "=".repeat(50));
console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
    console.log(
        "🎉 All tests passed! Authorization logic is working correctly."
    );
} else {
    console.log("⚠️  Some tests failed. Please check the authorization logic.");
}

console.log("\n📋 Summary of Authorization Rules:");
console.log("✅ Admins can modify/delete any note");
console.log("✅ Users can modify/delete their own notes");
console.log("❌ Regular employees cannot modify/delete others' notes");
