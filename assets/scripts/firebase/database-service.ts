import { database } from './firebase';
import authService from './auth-service';
import firebase from './firebase-compat.js';
import { INITIAL_MONEY } from '../constants';

export type UserData = {
    email: string;
    username: string;
    money: number;
    lastCollectionTime: number;
    lastOnline: number;
    friends: {
        [uid: string]: true;
    }
}

export type SavedFishType = {
    id?: string
    ownerId: string;
    type: string;
    health: number;
    lastFedTime: number;
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

    async getSavedFish(): Promise<SavedFishType[] | null> {
        const user = authService.getCurrentUser();

        if (!user) {
            console.warn('Cannot get saved fish: No user is signed in');
            return null;
        }

        // only get saved fish for the current user
        try {
            const snapshot = await database.ref(`users/${user.uid}/fishes`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved saved fish for user ${user.uid}:`, data);
            return data ? Object.keys(data).map(key => ({
                ...data[key],
                id: key // Include the key as an id for easier reference
            })) : null; // Return null if no fish data exists
        } catch (error) {
            console.error('Error getting saved fish:', error);
            return null;
        }
    }

    async addFish(fish: SavedFishType): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot add fish: No user is signed in');
            return;
        }

        try {
            const newFishRef = database.ref(`users/${user.uid}/fishes`).push();
            await newFishRef.set(fish);
            console.log(`Added new fish for user ${user.uid}:`, fish);
        } catch (error) {
            console.error('Error adding fish:', error);
        }
    }

    async updateFish(fishId: string, updates: Partial<SavedFishType>): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot update fish: No user is signed in');
            return;
        }

        try {
            await database.ref(`users/${user.uid}/fishes/${fishId}`).update(updates);
            console.log(`Updated fish ${fishId} for user ${user.uid}:`, updates);
        } catch (error) {
            console.error('Error updating fish:', error);
        }
    }

    async removeFish(fishId: string): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot remove fish: No user is signed in');
            return;
        }

        try {
            await database.ref(`users/${user.uid}/fishes/${fishId}`).remove();
            console.log(`Removed fish ${fishId} for user ${user.uid}`);
        } catch (error) {
            console.error('Error removing fish:', error);
        }
    }

    /**
     * Subscribe to real-time fish data updates using Firebase's callback
     * @param callback Function to call when fish data changes
     * @returns Firebase unsubscribe function or null if user not signed in
     */
    onFishDataChanged(callback: (fish: SavedFishType[] | null) => void): (() => void) | null {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot subscribe to fish data: No user is signed in');
            return null;
        }

        const fishRef = database.ref(`users/${user.uid}/fishes`);

        const unsubscribe = fishRef.on('value', (snapshot) => {
            const data = snapshot.val();
            let fishArray: SavedFishType[] | null = null;

            if (data) {
                fishArray = Object.keys(data).map(key => ({
                    ...data[key],
                    id: key
                }));
            }

            console.log(`Fish data updated for user ${user.uid}:`, fishArray);
            callback(fishArray);
        }, (error) => {
            console.error('Error in fish data listener:', error);
            callback(null);
        });

        // Return Firebase's off function
        return () => {
            fishRef.off('value', unsubscribe);
        };
    }

    /**
     * Get user data by UID (useful for social features)
     */
    async getUserDataByUid(uid: string): Promise<UserData | null> {
        try {
            const snapshot = await database.ref(`users/${uid}`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved user data for user ${uid}:`, data);
            return data || null;
        } catch (error) {
            console.error('Error getting user data by UID:', error);
            return null;
        }
    }

    /**
     * Update specific fields of user data
     */
    async updateUserData(updates: Partial<UserData>): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot update user data: No user is signed in');
            return;
        }

        try {
            await database.ref(`users/${user.uid}`).update(updates);
            console.log(`User data updated for user ${user.uid}:`, updates);
        } catch (error) {
            console.error('Error updating user data:', error);
        }
    }

    /**
     * Get fish data for a specific user (useful for social features)
     */
    async getFishByUid(uid: string): Promise<SavedFishType[] | null> {
        try {
            const snapshot = await database.ref(`users/${uid}/fishes`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved fish for user ${uid}:`, data);
            return data ? Object.keys(data).map(key => ({
                ...data[key],
                id: key
            })) : null;
        } catch (error) {
            console.error('Error getting fish by UID:', error);
            return null;
        }
    }

    async isUsernameAvailable(username: string): Promise<boolean> {
        try {
            const snapshot = await database.ref('users').orderByChild('username').equalTo(username).once('value');
            return !snapshot.exists(); // Returns true if username is available (doesn't exist)
        } catch (error) {
            console.error('Error checking username availability:', error);
            return false; // Assume unavailable on error for safety
        }
    }

    async createUserProfile(email: string, username: string): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot create user profile: No user is signed in');
            return;
        }

        const userData: UserData = {
            email: email,
            username: username,
            money: INITIAL_MONEY,
            lastCollectionTime: Date.now(),
            lastOnline: Date.now(),
            friends: {}
        };

        try {
            await this.setUserData(userData);
            console.log(`User profile created for ${user.uid} with username: ${username}`);
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }
}

const databaseService = new DatabaseService();
export default databaseService;
