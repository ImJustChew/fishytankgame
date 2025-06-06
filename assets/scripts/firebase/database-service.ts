import { database } from './firebase';
import authService from './auth-service';
import firebase from './firebase-compat.js';
import { INITIAL_MONEY, INITIAL_TANK } from '../constants';

export type UserAvatarCollection = {
    [avatarId: string]: {
        unlockedAt: number; // timestamp when avatar was unlocked
        timesWon: number; // how many times user has won this avatar
    };
}

export type UserData = {
    email: string;
    username: string;
    money: number;
    lastCollectionTime: number;
    lastOnline: number;
    friends: {
        [uid: string]: true;
    };
    playerPosition?: {
        x: number;
        y: number;
        lastUpdated: number;
    };
    selectedAvatar?: string; // currently selected avatar ID
    avatarCollection?: UserAvatarCollection; // unlocked avatars
    battleStats?: {
        level: number;
        winRate: number;
        lotteryTickets: number;
        totalBattles: number;
        totalWins: number;
    };
    tanktype: number;
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
            //console.log(`Updated fish ${fishId} for user ${user.uid}:`, updates);
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

    async updateUserMoney(newAmount: number): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot update money: No user is signed in');
            return;
        }

        try {
            await database.ref(`users/${user.uid}/money`).set(newAmount);
            console.log(`Updated money for user ${user.uid} to ${newAmount}`);
        } catch (error) {
            console.error('Error updating user money:', error);
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
            friends: {},
            playerPosition: {
                x: 0,
                y: 0,
                lastUpdated: Date.now()
            },
            battleStats: {
                level: 1,
                winRate: 0,
                lotteryTickets: 0,
                totalBattles: 0,
                totalWins: 0
            },
            tanktype: INITIAL_TANK,
        };

        try {
            await this.setUserData(userData);
            console.log(`User profile created for ${user.uid} with username: ${username}`);
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    }

    /**
     * Update player position in database
     */
    async updatePlayerPosition(x: number, y: number): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot update player position: No user is signed in');
            return;
        }

        try {
            const positionData = {
                x: Math.round(x * 10) / 10, // Round to 1 decimal place
                y: Math.round(y * 10) / 10,
                lastUpdated: Date.now()
            };

            await database.ref(`users/${user.uid}/playerPosition`).set(positionData);
            console.log(`Player position updated for user ${user.uid}:`, positionData);
        } catch (error) {
            console.error('Error updating player position:', error);
        }
    }

    /**
     * Get player position for a specific user
     */
    async getPlayerPosition(uid: string): Promise<{ x: number, y: number, lastUpdated: number } | null> {
        try {
            const snapshot = await database.ref(`users/${uid}/playerPosition`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved player position for user ${uid}:`, data);
            return data || null;
        } catch (error) {
            console.error('Error getting player position:', error);
            return null;
        }
    }

    /**
     * Subscribe to player position updates for a specific user
     * @param uid User ID to watch
     * @param callback Function to call when position changes
     * @returns Firebase unsubscribe function or null if invalid
     */
    onPlayerPositionChanged(uid: string, callback: (position: { x: number, y: number, lastUpdated: number } | null) => void): (() => void) | null {
        if (!uid) {
            console.warn('Cannot subscribe to player position: Invalid UID');
            return null;
        }

        const positionRef = database.ref(`users/${uid}/playerPosition`);

        const unsubscribe = positionRef.on('value', (snapshot) => {
            const data = snapshot.val();
            console.log(`Player position updated for user ${uid}:`, data);
            callback(data);
        }, (error) => {
            console.error('Error in player position listener:', error);
            callback(null);
        });

        // Return Firebase's off function
        return () => {
            positionRef.off('value', unsubscribe);
        };
    }

    /**
     * Get all friends' player positions for displaying other players in tank
     */
    async getFriendsPlayerPositions(): Promise<{ [uid: string]: { x: number, y: number, username: string, lastUpdated: number } }> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot get friends player positions: No user is signed in');
            return {};
        }

        try {
            // First get current user's friends list
            const userData = await this.getUserData();
            if (!userData || !userData.friends) {
                return {};
            }

            const friendsData: { [uid: string]: { x: number, y: number, username: string, lastUpdated: number } } = {};

            // Get position and username for each friend
            for (const friendUid of Object.keys(userData.friends)) {
                try {
                    const [positionData, friendUserData] = await Promise.all([
                        this.getPlayerPosition(friendUid),
                        this.getUserDataByUid(friendUid)
                    ]);

                    if (positionData && friendUserData) {
                        friendsData[friendUid] = {
                            x: positionData.x,
                            y: positionData.y,
                            username: friendUserData.username,
                            lastUpdated: positionData.lastUpdated
                        };
                    }
                } catch (error) {
                    console.error(`Error getting data for friend ${friendUid}:`, error);
                }
            }

            console.log('Retrieved friends player positions:', friendsData);
            return friendsData;
        } catch (error) {
            console.error('Error getting friends player positions:', error);
            return {};
        }
    }

    /**
     * Add an avatar to user's collection
     */
    async addAvatarToCollection(avatarId: string): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot add avatar to collection: No user is signed in');
            return;
        }

        try {
            const now = Date.now();
            const avatarRef = database.ref(`users/${user.uid}/avatarCollection/${avatarId}`);

            // Check if avatar already exists in collection
            const existing = await avatarRef.once('value');
            const existingData = existing.val();

            if (existingData) {
                // Increment times won
                await avatarRef.update({
                    timesWon: existingData.timesWon + 1
                });
            } else {
                // Add new avatar to collection
                await avatarRef.set({
                    unlockedAt: now,
                    timesWon: 1
                });
            }

            console.log(`Added avatar ${avatarId} to collection for user ${user.uid}`);
        } catch (error) {
            console.error('Error adding avatar to collection:', error);
        }
    }

    /**
     * Get user's avatar collection
     */
    async getAvatarCollection(): Promise<UserAvatarCollection | null> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot get avatar collection: No user is signed in');
            return null;
        }

        try {
            const snapshot = await database.ref(`users/${user.uid}/avatarCollection`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved avatar collection for user ${user.uid}:`, data);
            return data || {};
        } catch (error) {
            console.error('Error getting avatar collection:', error);
            return null;
        }
    }

    /**
     * Set user's selected avatar
     */
    async setSelectedAvatar(avatarId: string): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot set selected avatar: No user is signed in');
            return;
        }

        try {
            await database.ref(`users/${user.uid}/selectedAvatar`).set(avatarId);
            console.log(`Set selected avatar to ${avatarId} for user ${user.uid}`);
        } catch (error) {
            console.error('Error setting selected avatar:', error);
        }
    }

    /**
     * Get user's selected avatar
     */
    async getSelectedAvatar(): Promise<string | null> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot get selected avatar: No user is signed in');
            return null;
        }

        try {
            const snapshot = await database.ref(`users/${user.uid}/selectedAvatar`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved selected avatar for user ${user.uid}:`, data);
            return data || null;
        } catch (error) {
            console.error('Error getting selected avatar:', error);
            return null;
        }
    }

    /**
     * Get selected avatar for a specific user (for displaying other players)
     */
    async getSelectedAvatarByUid(uid: string): Promise<string | null> {
        try {
            const snapshot = await database.ref(`users/${uid}/selectedAvatar`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved selected avatar for user ${uid}:`, data);
            return data || null;
        } catch (error) {
            console.error('Error getting selected avatar by UID:', error);
            return null;
        }
    }

    /**
     * Get user's battle stats
     */
    async getBattleStats(): Promise<UserData['battleStats'] | null> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot get battle stats: No user is signed in');
            return null;
        }

        try {
            const snapshot = await database.ref(`users/${user.uid}/battleStats`).once('value');
            const data = snapshot.val();
            console.log(`Retrieved battle stats for user ${user.uid}:`, data);
            return data || null;
        } catch (error) {
            console.error('Error getting battle stats:', error);
            return null;
        }
    }

    /**
     * Update user's battle stats
     */
    async updateBattleStats(updates: Partial<UserData['battleStats']>): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot update battle stats: No user is signed in');
            return;
        }

        try {
            await database.ref(`users/${user.uid}/battleStats`).update(updates);
            console.log(`Battle stats updated for user ${user.uid}:`, updates);
        } catch (error) {
            console.error('Error updating battle stats:', error);
        }
    }

    /**
     * Initialize battle stats for a new user
     */
    async initializeBattleStats(uid: string): Promise<void> {
        try {
            const defaultBattleStats = {
                level: 1,
                winRate: 0,
                lotteryTickets: 0,
                totalBattles: 0,
                totalWins: 0
            };

            await database.ref(`users/${uid}/battleStats`).set(defaultBattleStats);
            console.log(`Initialized battle stats for user ${uid}:`, defaultBattleStats);
        } catch (error) {
            console.error('Error initializing battle stats:', error);
        }
    }

    /**
     * Add lottery tickets to user's account
     */
    async addLotteryTickets(ticketsToAdd: number): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot add lottery tickets: No user is signed in');
            return;
        }

        try {
            // Get current ticket count
            const battleStats = await this.getBattleStats();
            const currentTickets = battleStats?.lotteryTickets || 0;
            const newTicketCount = currentTickets + ticketsToAdd;

            // Update the ticket count
            await this.updateBattleStats({ lotteryTickets: newTicketCount });
            console.log(`Added ${ticketsToAdd} lottery tickets for user ${user.uid}. New total: ${newTicketCount}`);
        } catch (error) {
            console.error('Error adding lottery tickets:', error);
        }
    }

    /**
     * Record a battle result and update stats accordingly
     */
    async recordBattleResult(won: boolean, battleType: 'quick' | 'ranked'): Promise<void> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot record battle result: No user is signed in');
            return;
        }

        try {
            // Get current battle stats
            const currentStats = await this.getBattleStats();
            const stats = currentStats || {
                level: 1,
                winRate: 0,
                lotteryTickets: 0,
                totalBattles: 0,
                totalWins: 0
            };

            // Update battle statistics
            const newTotalBattles = stats.totalBattles + 1;
            const newTotalWins = stats.totalWins + (won ? 1 : 0);
            const newWinRate = Math.round((newTotalWins / newTotalBattles) * 100);

            // Calculate level based on total battles (simple progression)
            const newLevel = Math.floor(newTotalBattles / 10) + 1;

            // Calculate ticket rewards
            const WIN_TICKETS = 5;
            const LOSS_TICKETS = 1;
            const RANKED_BONUS = 2;

            let ticketsEarned = won ? WIN_TICKETS : LOSS_TICKETS;
            if (battleType === 'ranked') {
                ticketsEarned += RANKED_BONUS;
            }

            const newTicketCount = stats.lotteryTickets + ticketsEarned;

            // Update all stats
            await this.updateBattleStats({
                level: newLevel,
                winRate: newWinRate,
                lotteryTickets: newTicketCount,
                totalBattles: newTotalBattles,
                totalWins: newTotalWins
            });

            console.log(`Battle result recorded for user ${user.uid}: ${won ? 'Win' : 'Loss'} in ${battleType} mode. Tickets earned: ${ticketsEarned}`);
        } catch (error) {
            console.error('Error recording battle result:', error);
        }
    }

    /**
     * Save a match record to Firebase
     */
    async saveMatchRecord(matchRecord: any): Promise<void> {
        try {
            const matchRef = database.ref('matches').push();
            await matchRef.set({
                ...matchRecord,
                timestamp: Date.now(),
                version: '1.0'
            });
            console.log('Match record saved successfully:', matchRecord.matchId);
        } catch (error) {
            console.error('Failed to save match record:', error);
            throw error;
        }
    }

    /**
     * Get match records for a specific user
     */
    async getUserMatchHistory(userId: string, limit: number = 10): Promise<any[]> {
        try {
            const snapshot = await database.ref('matches')
                .orderByChild('playerIds')
                .equalTo(userId)
                .limitToLast(limit)
                .once('value');

            const data = snapshot.val();
            if (!data) return [];

            return Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
        } catch (error) {
            console.error('Error getting user match history:', error);
            return [];
        }
    }

    /**
     * Create a matchmaking request in Firebase
     */
    async createMatchRequest(request: any): Promise<string> {
        try {
            const requestRef = database.ref('matchRequests').push();
            await requestRef.set({
                ...request,
                timestamp: Date.now(),
                status: 'pending'
            });
            console.log('Match request created:', requestRef.key);
            return requestRef.key!;
        } catch (error) {
            console.error('Error creating match request:', error);
            throw error;
        }
    }

    /**
     * Find available match requests
     */
    async findMatchRequests(playerLevel: number, tankSize: string, excludePlayerId: string): Promise<any[]> {
        try {
            const snapshot = await database.ref('matchRequests')
                .orderByChild('status')
                .equalTo('pending')
                .once('value');

            const data = snapshot.val();
            if (!data) return [];

            // Filter compatible matches (similar level, same tank size, different player)
            const matches = Object.keys(data)
                .map(key => ({ ...data[key], id: key }))
                .filter(request =>
                    request.playerId !== excludePlayerId &&
                    request.tankSize === tankSize &&
                    Math.abs(request.playerLevel - playerLevel) <= 2 // Level difference tolerance
                );

            return matches;
        } catch (error) {
            console.error('Error finding match requests:', error);
            return [];
        }
    }

    /**
     * Accept a match request and create a match
     */
    async acceptMatchRequest(requestId: string, acceptingPlayerId: string): Promise<string> {
        try {
            // Create the match
            const matchRef = database.ref('activeMatches').push();
            const matchId = matchRef.key!;

            // Get the original request
            const requestSnapshot = await database.ref(`matchRequests/${requestId}`).once('value');
            const request = requestSnapshot.val();

            if (!request) {
                throw new Error('Match request not found');
            }

            // Create the match record
            await matchRef.set({
                player1: request.playerId,
                player2: acceptingPlayerId,
                status: 'active',
                createdAt: Date.now()
            });

            // Remove the match request
            await database.ref(`matchRequests/${requestId}`).remove();

            console.log('Match created:', matchId);
            return matchId;
        } catch (error) {
            console.error('Error accepting match request:', error);
            throw error;
        }
    }

    /**
     * Delete a match request
     */
    async deleteMatchRequest(requestId: string): Promise<void> {
        try {
            await database.ref(`matchRequests/${requestId}`).remove();
            console.log('Match request deleted:', requestId);
        } catch (error) {
            console.error('Error deleting match request:', error);
        }
    }
}

const databaseService = new DatabaseService();
export default databaseService;
