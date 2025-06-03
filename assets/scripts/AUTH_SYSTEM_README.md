# Complex Authentication System Documentation

This document describes the enhanced authentication system that provides a complete login flow with username selection and user data management.

## Overview

The authentication system now includes:

- Google sign-in integration
- Username selection dialog for new users
- User data creation with initial money and collection time
- Dynamic UI switching between login and user states
- Username uniqueness validation
- Complete user profile management

## Components

### 1. AuthButtonHandler.ts

The main authentication controller that orchestrates the entire login flow.

**Features:**

- Monitors authentication state changes
- Handles Google sign-in/sign-out
- Manages UI state transitions
- Prompts for username selection when needed
- Creates user profiles for new users

**Properties to assign in the editor:**

- `signInButton`: Button for Google sign-in
- `signOutButton`: Button for signing out
- `usernameLabel`: Label to display current username
- `signInContainer`: Node containing sign-in UI elements
- `userContainer`: Node containing signed-in user UI elements
- `usernameDialog`: Reference to the UsernameDialog component

### 2. UsernameDialog.ts

A dialog component for username selection with validation.

**Features:**

- Username validation (length, characters)
- Real-time availability checking
- Error message display
- Compulsory username selection (no cancel option)

**Properties to assign in the editor:**

- `dialogRoot`: Root node of the dialog (for show/hide)
- `usernameInput`: EditBox for username input
- `confirmButton`: Button to confirm username selection
- `errorLabel`: Label for displaying error messages

### 3. Enhanced DatabaseService

Extended with username management capabilities.

**New Methods:**

- `isUsernameAvailable(username: string)`: Checks if a username is available
- `createUserProfile(email: string, username: string)`: Creates a new user profile with initial data

### 4. Constants.ts

Contains application-wide constants.

**Constants:**

- `INITIAL_MONEY`: Starting money amount for new users (100)
- `USERNAME_MIN_LENGTH`: Minimum username length (3)
- `USERNAME_MAX_LENGTH`: Maximum username length (20)

## User Flow

1. **Initial State**: User sees sign-in button
2. **Google Sign-in**: User clicks sign-in button and authenticates with Google
3. **Profile Check**: System checks if user has a complete profile
4. **New User Flow**:
   - Username dialog appears (cannot be dismissed)
   - User enters desired username
   - System validates username (length, characters, uniqueness)
   - If valid and available, user profile is created
   - UI switches to show username and logout button
   - If invalid, user must correct and try again
5. **Returning User Flow**:
   - System loads existing user data
   - UI immediately switches to show username and logout button
6. **Incomplete Profile Flow**:
   - If user is signed in but missing username, prompt for username selection
7. **Sign-out**: User can click logout button to sign out

## Username Validation Rules

- Minimum length: 3 characters
- Maximum length: 20 characters
- Allowed characters: letters (a-z, A-Z), numbers (0-9), and underscores (\_)
- Must be unique across all users

## User Data Structure

```typescript
type UserData = {
  email: string; // User's email from Google account
  username: string; // Selected unique username
  money: number; // Starting with INITIAL_MONEY (100)
  lastCollectionTime: number; // Timestamp of last collection
  friends: {
    // Friend relationships
    [uid: string]: true;
  };
};
```

## Setup Instructions

1. **Scene Setup**:

   - Create sign-in container with sign-in button
   - Create user container with username label and sign-out button
   - Create username dialog with input field, confirm/cancel buttons, and error label
   - Initially hide user container and username dialog

2. **Component Assignment**:

   - Add `AuthButtonHandler` to a game object
   - Add `UsernameDialog` to the dialog game object
   - Assign all required properties in the inspector
   - Note: Username selection is compulsory - users cannot proceed without selecting a username

3. **UI Hierarchy Example**:
   ```
   AuthUI
   ├── SignInContainer
   │   └── SignInButton
   ├── UserContainer
   │   ├── UsernameLabel
   │   └── SignOutButton   └── UsernameDialog
       ├── DialogBackground
       ├── UsernameInput
       ├── ConfirmButton
       └── ErrorLabel
   ```

## Error Handling

The system includes comprehensive error handling for:

- Network connectivity issues
- Firebase authentication errors
- Username validation failures
- Database operation errors
- User cancellation scenarios

## Security Considerations

- Username uniqueness is validated server-side
- User data is associated with Firebase Authentication UID
- Input validation prevents malicious username entries
- Proper error handling prevents information leakage

## Future Enhancements

Potential improvements could include:

- Username change functionality
- Profile picture support
- Email verification requirements
- Social login providers beyond Google
- Username reservation system
- Profanity filtering for usernames
