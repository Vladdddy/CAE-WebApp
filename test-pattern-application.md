# Shift Pattern System Test Guide

## Overview

The shift pattern system has been successfully implemented with the following features:

### Admin Pattern

-   **Pattern**: ON, OP, O, ON, OP (Monday to Friday)
-   **Weekends**: R (Riposo)
-   **Cycle**: 5-day rotation that repeats throughout the month

### Employee Pattern

-   **Pattern**: O, OP, ON, F, M (Monday to Friday)
-   **Weekends**: R (Riposo)
-   **Cycle**: 5-day rotation that repeats throughout the month

## How to Test

1. **Login** as an admin user (Mario, Luca, Simone, or Gianluca)

2. **Navigate to Shifts page**

3. **Click the "Pattern" button** (green button next to Export)

4. **In the Pattern Modal**:

    - Select pattern type (Admin or Employee)
    - Choose users to apply the pattern to
    - Use quick selection buttons:
        - "Seleziona tutti gli Admin" - applies admin pattern to all admin users
        - "Seleziona tutti gli Employee" - applies employee pattern to all employees
        - "Deseleziona tutto" - clears selection

5. **Click "Applica Pattern"** to apply the selected pattern

## Pattern Logic

### Admin Pattern Implementation:

-   **Week 1**: Mon(ON), Tue(OP), Wed(O), Thu(ON), Fri(OP), Sat(R), Sun(R)
-   **Week 2**: Mon(ON), Tue(OP), Wed(O), Thu(ON), Fri(OP), Sat(R), Sun(R)
-   **Week 3**: Mon(ON), Tue(OP), Wed(O), Thu(ON), Fri(OP), Sat(R), Sun(R)
-   **Week 4**: Mon(ON), Tue(OP), Wed(O), Thu(ON), Fri(OP), Sat(R), Sun(R)

The pattern starts from the first Monday of the selected month and applies consistently throughout.

## Features Added:

1. **Pattern Modal** - Interface for selecting patterns and users
2. **Quick Selection Buttons** - Easy selection of user groups
3. **Pattern Preview** - Visual representation of shift patterns
4. **Admin Control** - Only admins can apply patterns
5. **Server Integration** - Patterns are saved to the backend
6. **Month-wide Application** - Patterns apply to the entire selected month

## Current Admin Users:

-   Mario (admin)
-   Luca (admin)
-   Simone (admin)
-   Gianluca (admin)

## Current Employee Users:

-   Sara (employee)
-   Andrea (employee)
-   Francesco (employee)
-   Nicolo (employee)

## Next Steps:

-   Test the pattern application
-   Verify the shifts are correctly assigned
-   Customize employee patterns as needed
-   Add additional pattern types if required
