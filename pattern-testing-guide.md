# Pattern Application Test Guide

This guide helps you test both the Admin and Employee shift patterns in the application.

## Patterns Overview

### Admin Pattern (Weekday-based)

-   **Monday-Friday**: ON, OP, O, ON, OP (5-day cycle)
-   **Weekends**: R (Riposo)
-   **Type**: Weekday-based (respects weekdays vs weekends)

### Employee Pattern (Continuous Cycle)

-   **Pattern**: O O O O R R ON ON ON ON R R (12-day cycle)
-   **Type**: Continuous cycle (ignores weekdays/weekends)
-   **D** = Day shift = **O**
-   **N** = Night shift = **ON**
-   **R** = Riposo (Rest)

## Testing Steps

### 1. Test Admin Pattern

1. Navigate to Shifts page in July 2025
2. Click "Applica Pattern" button
3. Select "Admin Pattern"
4. Select one or more admin users
5. Click "Applica Pattern"

**Expected Results for Admin Pattern:**

-   Weekdays follow the pattern: ON, OP, O, ON, OP
-   Weekends show "R" with "Riposo" note
-   Different users have offset patterns (User1 starts with Monday=ON, User2 starts with Monday=OP, etc.)

### 2. Test Employee Pattern

1. Navigate to Shifts page in July 2025
2. Click "Applica Pattern" button
3. Select "Employee Pattern"
4. Select one or more employee users
5. Click "Applica Pattern"

**Expected Results for Employee Pattern:**

-   Follows 12-day cycle: O O O O R R ON ON ON ON R R
-   Pattern continues regardless of weekdays/weekends
-   Different users start at different points in the cycle
-   "R" days have "Riposo" note

### 3. Verify Pattern Preview

In the pattern modal:

-   Admin pattern should show: ON OP O ON OP
-   Employee pattern should show: O O O O R R ON ON ON ON R R

### 4. Test Multiple Users

Apply patterns to multiple users and verify:

-   Each user gets a different offset in the pattern
-   On the same day, different users should have different shifts
-   Patterns should be consistent and repeatable

### 5. Test Pattern Clearing

1. Apply any pattern
2. Click "Cancella Turni"
3. Verify all shifts are cleared for the current month

## July 2025 Test Data

For reference, July 2025 starts on a Tuesday and has 31 days.

### Expected Admin Pattern (User1, starting Tuesday):

-   July 1 (Tue): OP (Tuesday = index 1 in pattern)
-   July 2 (Wed): O
-   July 3 (Thu): ON
-   July 4 (Fri): OP
-   July 5 (Sat): R (Riposo)
-   July 6 (Sun): R (Riposo)
-   July 7 (Mon): ON
-   July 8 (Tue): OP
-   And so on...

### Expected Employee Pattern (User1, no offset):

-   July 1-4: O O O O
-   July 5-6: R R (with Riposo notes)
-   July 7-10: ON ON ON ON
-   July 11-12: R R (with Riposo notes)
-   July 13-16: O O O O (cycle repeats)
-   And so on...

## Troubleshooting

-   If patterns don't apply, check console for errors
-   Verify you have the correct user role permissions
-   Make sure you're connected to the backend server
-   Check that the selected month has data initialized
