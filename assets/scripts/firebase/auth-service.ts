import { firebaseApp } from './firebase';
import firebase from './firebase-compat.js';

class AuthService {
    private auth: firebase.auth.Auth;

    constructor() {
        this.auth = firebase.auth(firebaseApp);
    }

    async signInWithGoogle(): Promise<firebase.auth.UserCredential> {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            return await this.auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Google sign-in error:', error);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    getCurrentUser(): firebase.User | null {
        return this.auth.currentUser;
    }

    onAuthStateChanged(callback: (user: firebase.User | null) => void): firebase.Unsubscribe {
        return this.auth.onAuthStateChanged(callback);
    }
}

const authService = new AuthService();
export default authService;
