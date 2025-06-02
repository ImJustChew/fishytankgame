import { database } from './firebase';
import authService from './auth-service';

export type UserData = {
    email: string;
    username: string;
    money: number;
    lastCollectionTime: number;
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

}

const databaseService = new DatabaseService();
export default databaseService;
