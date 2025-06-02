import { database } from './firebase';
import authService from './auth-service';
import firebase from './firebase-compat.js';

export type UserData = {
    email: string;
    highScore: number;
}

class DatabaseService {

    async getUserData(): Promise<UserData | null> {
        const user = authService.getCurrentUser();

        if (!user) {
            console.warn('Cannot get user data: No user is signed in');
            return null;
        }

        try {
            const snapshot = await database.ref(`users/${user.uid}`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved user data for user ${user.uid}:`, data);
            return data || null; // Return null if no data exists
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    async setUserData(data: UserData): Promise<void> {
        const user = authService.getCurrentUser();

        if (!user) {
            console.warn('Cannot set user data: No user is signed in');
            return;
        }

        try {
            await database.ref(`users/${user.uid}`).set(data);
            console.log(`User data for user ${user.uid} has been set:`, data);
        } catch (error) {
            console.error('Error setting user data:', error);
        }
    }

}

const databaseService = new DatabaseService();
export default databaseService;
