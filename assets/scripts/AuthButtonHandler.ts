import { _decorator, Component, Button, Node, Label } from 'cc';
import authService from './firebase/auth-service';
import databaseService, { UserData } from './firebase/database-service';
import { UsernameDialog } from './UsernameDialog';
import { INITIAL_MONEY } from './constants';
import firebase from './firebase/firebase-compat.js';

const { ccclass, property } = _decorator;

/**
 * AuthButtonHandler
 * 
 * This class handles the complete Google auth flow with username selection and user data management
 */
@ccclass('AuthButtonHandler')
export class AuthButtonHandler extends Component {
    @property({
        type: Button,
        tooltip: 'The Button component that will trigger the Google sign-in'
    })
    private signInButton: Button | null = null;

    @property({
        type: Button,
        tooltip: 'The Button component that will trigger sign-out'
    })
    private signOutButton: Button | null = null;

    @property({
        type: Label,
        tooltip: 'Label to display the current username'
    })
    private usernameLabel: Label | null = null;

    @property({
        type: Node,
        tooltip: 'Container for sign-in UI elements'
    })
    private signInContainer: Node | null = null;

    @property({
        type: Node,
        tooltip: 'Container for signed-in user UI elements'
    })
    private userContainer: Node | null = null;

    @property({
        type: UsernameDialog,
        tooltip: 'Dialog for username selection'
    })
    private usernameDialog: UsernameDialog | null = null;

    private authStateUnsubscribe: firebase.Unsubscribe | null = null;

    start() {
        this.setupEventListeners();
        this.setupAuthStateListener();
    }

    private setupEventListeners() {
        if (this.signInButton) {
            this.signInButton.node.on(Button.EventType.CLICK, this.handleSignIn, this);
        } else {
            console.error('[AuthButtonHandler] Sign in button not assigned!');
        }

        if (this.signOutButton) {
            this.signOutButton.node.on(Button.EventType.CLICK, this.handleSignOut, this);
        }
    }

    private setupAuthStateListener() {
        this.authStateUnsubscribe = authService.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('[AuthButtonHandler] User signed in:', user.displayName);
                await this.handleUserSignedIn(user);
            } else {
                console.log('[AuthButtonHandler] User signed out');
                this.showSignInUI();
            }
        });
    }

    private async handleUserSignedIn(user: firebase.User) {
        try {
            // Check if user data exists
            const userData = await databaseService.getUserData();

            if (userData && userData.username) {
                // User has complete profile
                this.showUserUI(userData.username);
            } else {
                // User needs to select a username
                this.promptForUsername(user);
            }
        } catch (error) {
            console.error('[AuthButtonHandler] Error handling signed in user:', error);
            this.showSignInUI();
        }
    } private promptForUsername(user: firebase.User) {
        if (!this.usernameDialog) {
            console.error('[AuthButtonHandler] Username dialog not assigned!');
            return;
        }

        this.usernameDialog.show(
            async (username: string) => {
                await this.createUserProfile(user, username);
            }
        );
    }

    private async createUserProfile(user: firebase.User, username: string) {
        try {
            await databaseService.createUserProfile(
                user.email || '',
                username
            );

            console.log('[AuthButtonHandler] User profile created successfully');
            this.showUserUI(username);
        } catch (error) {
            console.error('[AuthButtonHandler] Error creating user profile:', error);
            // Show username dialog again on error
            this.promptForUsername(user);
        }
    }

    private showSignInUI() {
        if (this.signInContainer) {
            this.signInContainer.active = true;
        }
        if (this.userContainer) {
            this.userContainer.active = false;
        }
    }

    private showUserUI(username: string) {
        if (this.signInContainer) {
            this.signInContainer.active = false;
        }
        if (this.userContainer) {
            this.userContainer.active = true;
        }
        if (this.usernameLabel) {
            this.usernameLabel.string = `Welcome, ${username}!`;
        }
    }

    /**
     * Handle the sign-in button click
     */
    private async handleSignIn() {
        try {
            console.log('[AuthButtonHandler] Attempting to sign in with Google...');
            const userCredential = await authService.signInWithGoogle();
            console.log('[AuthButtonHandler] Sign-in successful!', userCredential.user?.displayName);

            // Auth state listener will handle the rest
        } catch (error) {
            console.error('[AuthButtonHandler] Sign-in failed:', error);
        }
    }

    /**
     * Handle the sign-out button click
     */
    private async handleSignOut() {
        try {
            console.log('[AuthButtonHandler] Signing out...');
            await authService.signOut();
            console.log('[AuthButtonHandler] Sign-out successful!');
        } catch (error) {
            console.error('[AuthButtonHandler] Sign-out failed:', error);
        }
    } onDestroy() {
        // Remove event listeners when component is destroyed
        if (this.signInButton && this.signInButton.node) {
            this.signInButton.node.off(Button.EventType.CLICK, this.handleSignIn, this);
        }
        if (this.signOutButton && this.signOutButton.node) {
            this.signOutButton.node.off(Button.EventType.CLICK, this.handleSignOut, this);
        }

        // Unsubscribe from auth state changes
        if (this.authStateUnsubscribe) {
            this.authStateUnsubscribe();
        }
    }
}
