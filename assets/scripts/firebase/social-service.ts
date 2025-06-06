import { database } from './firebase';
import authService from './auth-service';
import databaseService, { UserData, SavedFishType } from './database-service';

export type FriendData = {
    uid: string;
    username: string;
    email: string;
    money: number;
    lastOnline: number;
}

export type StealAttempt = {
    id?: string;
    thiefUid: string;
    thiefUsername: string;
    victimUid: string;
    fishId: string;
    fishType: string;
    timestamp: number;
    success: boolean;
    detected: boolean;
}

class SocialService {

    /**
     * Send a friend request to another user by their username or email
     */
    async sendFriendRequest(targetIdentifier: string): Promise<{ success: boolean; message: string }> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return { success: false, message: 'No user is signed in' };
        }

        try {
            // Find target user by username or email
            const targetUser = await this.findUserByIdentifier(targetIdentifier);
            if (!targetUser) {
                return { success: false, message: 'User not found' };
            }

            if (targetUser.uid === currentUser.uid) {
                return { success: false, message: 'Cannot send friend request to yourself' };
            }

            // Check if already friends
            const isAlreadyFriend = await this.checkIfFriends(targetUser.uid);
            if (isAlreadyFriend) {
                return { success: false, message: 'Already friends with this user' };
            }

            // Check if friend request already exists
            const existingRequest = await this.checkExistingFriendRequest(currentUser.uid, targetUser.uid);
            if (existingRequest) {
                return { success: false, message: 'Friend request already sent or pending' };
            }

            // Add to target user's pendingFriends
            await database.ref(`users/${targetUser.uid}/pendingFriends/${currentUser.uid}`).set(true);

            console.log(`Friend request sent from ${currentUser.uid} to ${targetUser.uid}`);
            return { success: true, message: 'Friend request sent successfully' };

        } catch (error) {
            console.error('Error sending friend request:', error);
            return { success: false, message: 'Failed to send friend request' };
        }
    }

    /**
     * Get incoming friend requests for the current user
     */
    async getIncomingFriendRequests(): Promise<FriendData[] | null> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot get friend requests: No user is signed in');
            return null;
        }

        try {
            const snapshot = await database.ref(`users/${currentUser.uid}/pendingFriends`).once('value');
            const pendingFriends = snapshot.val();

            if (!pendingFriends) return [];

            const requestUids = Object.keys(pendingFriends);
            const friendRequests: FriendData[] = [];

            // Get user data for each pending friend
            for (const uid of requestUids) {
                const userSnapshot = await database.ref(`users/${uid}`).once('value');
                const userData = userSnapshot.val();
                if (userData) {
                    friendRequests.push({
                        uid,
                        username: userData.username,
                        email: userData.email,
                        money: userData.money,
                        lastOnline: userData.lastOnline
                    });
                }
            }

            console.log(`Retrieved ${friendRequests.length} incoming friend requests`);
            return friendRequests;

        } catch (error) {
            console.error('Error getting friend requests:', error);
            return null;
        }
    }

    /**
     * Accept a friend request
     */
    async acceptFriendRequest(fromUid: string): Promise<{ success: boolean; message: string }> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return { success: false, message: 'No user is signed in' };
        }

        try {
            // Check if the friend request exists
            const pendingSnapshot = await database.ref(`users/${currentUser.uid}/pendingFriends/${fromUid}`).once('value');
            if (!pendingSnapshot.exists()) {
                return { success: false, message: 'Friend request not found' };
            }

            // Add each user to the other's friends list and remove from pending
            const updates: { [key: string]: any } = {};
            updates[`users/${currentUser.uid}/friends/${fromUid}`] = true;
            updates[`users/${fromUid}/friends/${currentUser.uid}`] = true;
            updates[`users/${currentUser.uid}/pendingFriends/${fromUid}`] = null;

            await database.ref().update(updates);

            console.log(`Friend request accepted: ${fromUid} and ${currentUser.uid} are now friends`);
            return { success: true, message: 'Friend request accepted' };

        } catch (error) {
            console.error('Error accepting friend request:', error);
            return { success: false, message: 'Failed to accept friend request' };
        }
    }

    /**
     * Reject a friend request
     */
    async rejectFriendRequest(fromUid: string): Promise<{ success: boolean; message: string }> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return { success: false, message: 'No user is signed in' };
        }

        try {
            // Check if the friend request exists
            const pendingSnapshot = await database.ref(`users/${currentUser.uid}/pendingFriends/${fromUid}`).once('value');
            if (!pendingSnapshot.exists()) {
                return { success: false, message: 'Friend request not found' };
            }

            // Remove from pending friends
            await database.ref(`users/${currentUser.uid}/pendingFriends/${fromUid}`).remove();

            console.log(`Friend request rejected: ${fromUid}`);
            return { success: true, message: 'Friend request rejected' };

        } catch (error) {
            console.error('Error rejecting friend request:', error);
            return { success: false, message: 'Failed to reject friend request' };
        }
    }

    /**
     * Get list of current user's friends with their data
     */
    async getFriendsList(): Promise<FriendData[] | null> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot get friends list: No user is signed in');
            return null;
        }

        try {
            const userData = await databaseService.getUserData();
            if (!userData || !userData.friends) {
                return [];
            }

            const friendUids = Object.keys(userData.friends);
            const friends: FriendData[] = [];

            // Get user data for each friend
            for (const uid of friendUids) {
                const friendSnapshot = await database.ref(`users/${uid}`).once('value');
                const friendData = friendSnapshot.val();
                if (friendData) {
                    friends.push({
                        uid,
                        username: friendData.username,
                        email: friendData.email,
                        money: friendData.money,
                        lastOnline: friendData.lastOnline
                    });
                }
            }

            console.log(`Retrieved ${friends.length} friends`);
            return friends;

        } catch (error) {
            console.error('Error getting friends list:', error);
            return null;
        }
    }

    async getPendingFriendsList(): Promise<FriendData[] | null> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot get pending friends list: No user is signed in');
            return null;
        }
        try {
            const snapshot = await database.ref(`users/${currentUser.uid}/pendingFriends`).once('value');
            const pendingFriends = snapshot.val();

            if (!pendingFriends) return [];

            const requestUids = Object.keys(pendingFriends);
            const pendingRequests: FriendData[] = [];

            // Get user data for each pending friend
            for (const uid of requestUids) {
                const userSnapshot = await database.ref(`users/${uid}`).once('value');
                const userData = userSnapshot.val();
                if (userData) {
                    pendingRequests.push({
                        uid,
                        username: userData.username,
                        email: userData.email,
                        money: userData.money,
                        lastOnline: userData.lastOnline
                    });
                }
            }

            console.log(`Retrieved ${pendingRequests.length} pending friend requests`);
            return pendingRequests;

        } catch (error) {
            console.error('Error getting pending friends list:', error);
            return null;
        }
    }

    /**
     * Get a friend's fish collection
     */
    async getFriendsFish(friendUid: string): Promise<SavedFishType[] | null> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot get friend\'s fish: No user is signed in');
            return null;
        }

        // Verify friendship
        const isFriend = await this.checkIfFriends(friendUid);
        if (!isFriend) {
            console.warn('Cannot view fish: Not friends with this user');
            return null;
        }

        try {
            const snapshot = await database.ref(`users/${friendUid}/fishes`).once('value');
            const data = snapshot.val();

            if (!data) return [];

            const fishArray = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));

            console.log(`Retrieved ${fishArray.length} fish from friend ${friendUid}`);
            return fishArray;

        } catch (error) {
            console.error('Error getting friend\'s fish:', error);
            return null;
        }
    }

    /**
     * Attempt to steal a fish from a friend
     */
    async stealFish(friendUid: string, fishId: string): Promise<{ success: boolean; message: string; detected?: boolean }> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return { success: false, message: 'No user is signed in' };
        }

        // Verify friendship
        const isFriend = await this.checkIfFriends(friendUid);
        if (!isFriend) {
            return { success: false, message: 'Can only steal from friends' };
        }

        try {
            // Get the target fish
            const fishSnapshot = await database.ref(`users/${friendUid}/fishes/${fishId}`).once('value');
            const targetFish: SavedFishType = fishSnapshot.val();

            if (!targetFish) {
                return { success: false, message: 'Fish not found' };
            }

            // Calculate steal success based on fish health and random chance
            const stealChance = this.calculateStealChance(targetFish.health);
            const stealSuccess = Math.random() < stealChance;

            // Calculate detection chance (lower health fish are easier to steal undetected)
            const detectionChance = Math.max(0.3, targetFish.health / 100 * 0.7);
            const detected = Math.random() < detectionChance;

            // Get current user data for username
            const currentUserData = await databaseService.getUserData();
            if (!currentUserData) {
                return { success: false, message: 'Could not retrieve user data' };
            }

            // Record the steal attempt in a separate collection for history
            const stealAttempt: StealAttempt = {
                thiefUid: currentUser.uid,
                thiefUsername: currentUserData.username,
                victimUid: friendUid,
                fishId: fishId,
                fishType: targetFish.type,
                timestamp: Date.now(),
                success: stealSuccess,
                detected: detected
            };

            const stealRef = database.ref('stealAttempts').push();
            await stealRef.set(stealAttempt);

            if (stealSuccess) {
                // Transfer the fish
                const stolenFish: SavedFishType = {
                    ...targetFish,
                    ownerId: currentUser.uid,
                    health: Math.max(10, targetFish.health - 20) // Reduce health from stress
                };

                const updates: { [key: string]: any } = {};
                updates[`users/${friendUid}/fishes/${fishId}`] = null; // Remove from friend

                // Add to current user
                const newFishRef = database.ref(`users/${currentUser.uid}/fishes`).push();
                updates[`users/${currentUser.uid}/fishes/${newFishRef.key}`] = stolenFish;

                await database.ref().update(updates);

                const message = detected
                    ? `Successfully stole ${targetFish.type} but were detected!`
                    : `Successfully stole ${targetFish.type} without being detected!`;

                return { success: true, message, detected };
            } else {
                const message = detected
                    ? 'Steal attempt failed and you were caught!'
                    : 'Steal attempt failed but you weren\'t detected.';

                return { success: false, message, detected };
            }

        } catch (error) {
            console.error('Error stealing fish:', error);
            return { success: false, message: 'Failed to steal fish' };
        }
    }

    /**
     * Get steal attempts (both incoming and outgoing) for the current user
     */
    async getStealHistory(): Promise<{ incoming: StealAttempt[]; outgoing: StealAttempt[] } | null> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot get steal history: No user is signed in');
            return null;
        }

        try {
            // Get incoming steal attempts (where current user is the victim)
            const incomingSnapshot = await database.ref('stealAttempts')
                .orderByChild('victimUid')
                .equalTo(currentUser.uid)
                .once('value');

            // Get outgoing steal attempts (where current user is the thief)
            const outgoingSnapshot = await database.ref('stealAttempts')
                .orderByChild('thiefUid')
                .equalTo(currentUser.uid)
                .once('value');

            const incomingData = incomingSnapshot.val() || {};
            const outgoingData = outgoingSnapshot.val() || {};

            const incoming = Object.keys(incomingData).map(key => ({ ...incomingData[key], id: key }));
            const outgoing = Object.keys(outgoingData).map(key => ({ ...outgoingData[key], id: key }));

            // Sort by timestamp (newest first)
            incoming.sort((a, b) => b.timestamp - a.timestamp);
            outgoing.sort((a, b) => b.timestamp - a.timestamp);

            console.log(`Retrieved steal history: ${incoming.length} incoming, ${outgoing.length} outgoing`);
            return { incoming, outgoing };

        } catch (error) {
            console.error('Error getting steal history:', error);
            return null;
        }
    }

    /**
     * Remove a friend from the current user's friends list
     * Also remove pending friend requests if they exist
     */
    async removeFriend(friendUid: string): Promise<{ success: boolean; message: string }> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return { success: false, message: 'No user is signed in' };
        }

        try {
            const updates: { [key: string]: any } = {};
            updates[`users/${currentUser.uid}/friends/${friendUid}`] = null;
            updates[`users/${friendUid}/friends/${currentUser.uid}`] = null;
            updates[`users/${currentUser.uid}/friends/${friendUid}`] = null;

            await database.ref().update(updates);

            console.log(`Removed friend: ${friendUid}`);
            return { success: true, message: 'Friend removed successfully' };

        } catch (error) {
            console.error('Error removing friend:', error);
            return { success: false, message: 'Failed to remove friend' };
        }
    }

    // Helper Methods

    private async findUserByIdentifier(identifier: string): Promise<{ uid: string; username: string; email: string } | null> {
        try {
            // Search by username first
            const usernameSnapshot = await database.ref('users')
                .orderByChild('username')
                .equalTo(identifier)
                .once('value');

            const usernameData = usernameSnapshot.val();
            if (usernameData) {
                const uid = Object.keys(usernameData)[0];
                return { uid, username: usernameData[uid].username, email: usernameData[uid].email };
            }

            // Search by email if username not found
            const emailSnapshot = await database.ref('users')
                .orderByChild('email')
                .equalTo(identifier)
                .once('value');

            const emailData = emailSnapshot.val();
            if (emailData) {
                const uid = Object.keys(emailData)[0];
                return { uid, username: emailData[uid].username, email: emailData[uid].email };
            }

            return null;
        } catch (error) {
            console.error('Error finding user:', error);
            return null;
        }
    }

    private async checkIfFriends(friendUid: string): Promise<boolean> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) return false;

        try {
            const snapshot = await database.ref(`users/${currentUser.uid}/friends/${friendUid}`).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Error checking friendship status:', error);
            return false;
        }
    }

    private async checkExistingFriendRequest(fromUid: string, toUid: string): Promise<boolean> {
        try {
            // Check if there's already a pending request from current user to target user
            const pendingToSnapshot = await database.ref(`users/${toUid}/pendingFriends/${fromUid}`).once('value');
            if (pendingToSnapshot.exists()) {
                return true;
            }

            // Check if there's already a pending request from target user to current user
            const pendingFromSnapshot = await database.ref(`users/${fromUid}/pendingFriends/${toUid}`).once('value');
            if (pendingFromSnapshot.exists()) {
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking existing friend request:', error);
            return false;
        }
    }

    private calculateStealChance(fishHealth: number): number {
        // Lower health fish are easier to steal
        // Health 100 = 10% steal chance, Health 0 = 80% steal chance
        return Math.max(0.1, Math.min(0.8, 0.8 - (fishHealth / 100) * 0.7));
    }

    /**
     * Subscribe to pending friend requests updates
     */
    onPendingFriendsChanged(callback: (requests: FriendData[] | null) => void): (() => void) | null {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot subscribe to pending friends: No user is signed in');
            return null;
        }

        const pendingRef = database.ref(`users/${currentUser.uid}/pendingFriends`);

        const unsubscribe = pendingRef.on('value', async (snapshot) => {
            const pendingFriends = snapshot.val();
            let requestsArray: FriendData[] | null = null;

            if (pendingFriends) {
                const requestUids = Object.keys(pendingFriends);
                const requests: FriendData[] = [];

                // Get user data for each pending friend
                for (const uid of requestUids) {
                    try {
                        const userSnapshot = await database.ref(`users/${uid}`).once('value');
                        const userData = userSnapshot.val();
                        if (userData) {
                            requests.push({
                                uid,
                                username: userData.username,
                                email: userData.email,
                                money: userData.money,
                                lastOnline: userData.lastOnline
                            });
                        }
                    } catch (error) {
                        console.error('Error getting pending friend data:', error);
                    }
                }

                requestsArray = requests;
            }

            console.log(`Pending friends updated: ${requestsArray ? requestsArray.length : 0} pending requests`);
            callback(requestsArray);
        }, (error) => {
            console.error('Error in pending friends listener:', error);
            callback(null);
        });

        return () => {
            pendingRef.off('value', unsubscribe);
        };
    }

    /**
     * Subscribe to a friend's fish collection changes in real-time
     * @param friendUid The UID of the friend whose fish to monitor
     * @param callback Function to call when fish data changes
     * @returns Unsubscribe function to stop listening
     */
    onFriendsFishChanged(friendUid: string, callback: (fish: SavedFishType[] | null) => void): (() => void) | null {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot subscribe to friend\'s fish: No user is signed in');
            return null;
        }

        // First verify friendship
        this.checkIfFriends(friendUid).then(isFriend => {
            if (!isFriend) {
                console.warn('Cannot subscribe to fish: Not friends with this user');
                callback(null);
                return;
            }
        });

        const fishRef = database.ref(`users/${friendUid}/fishes`);

        const unsubscribe = fishRef.on('value', (snapshot) => {
            // Re-verify friendship on each update for security
            this.checkIfFriends(friendUid).then(isFriend => {
                if (!isFriend) {
                    console.warn('Friendship ended, stopping fish updates');
                    callback(null);
                    return;
                }

                const data = snapshot.val();
                if (!data) {
                    callback([]);
                    return;
                }

                const fishArray = Object.keys(data).map(key => ({
                    ...data[key],
                    id: key
                }));

                console.log(`Real-time update: Friend ${friendUid} has ${fishArray.length} fish`);
                callback(fishArray);
            }).catch(error => {
                console.error('Error verifying friendship in real-time listener:', error);
                callback(null);
            });
        }, (error) => {
            console.error('Error in friend fish listener:', error);
            callback(null);
        });

        return () => {
            fishRef.off('value', unsubscribe);
            console.log(`Unsubscribed from friend ${friendUid} fish updates`);
        };
    }

    /**
     * Subscribe to steal attempts targeting the current user
     */
    onStealAttemptsChanged(callback: (attempts: StealAttempt[] | null) => void): (() => void) | null {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot subscribe to steal attempts: No user is signed in');
            return null;
        }

        const attemptsRef = database.ref('stealAttempts').orderByChild('victimUid').equalTo(currentUser.uid);

        const unsubscribe = attemptsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            let attemptsArray: StealAttempt[] | null = null;

            if (data) {
                attemptsArray = Object.keys(data)
                    .map(key => ({ ...data[key], id: key }))
                    .sort((a, b) => b.timestamp - a.timestamp);
            }

            console.log(`Steal attempts updated: ${attemptsArray ? attemptsArray.length : 0} attempts`);
            callback(attemptsArray);
        }, (error) => {
            console.error('Error in steal attempts listener:', error);
            callback(null);
        });

        return () => {
            attemptsRef.off('value', unsubscribe);
        };
    }


    async getCurrentUserTankType(): Promise<number | null> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot get tanktype: No user is signed in');
            return null;
        }
        try {
            const snapshot = await database.ref(`users/${currentUser.uid}/tanktype`).once('value');
            const tanktype = snapshot.val();
            return typeof tanktype === 'number' ? tanktype : null;
        } catch (error) {
            console.error('Error getting tanktype:', error);
            return null;
        }
    }

    async setCurrentUserTankType(tanktype: number): Promise<void> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot set tanktype: No user is signed in');
            return;
        }
        try {
            await database.ref(`users/${currentUser.uid}/tanktype`).set(tanktype);
            console.log(`Tanktype updated for user ${currentUser.uid}:`, tanktype);
        } catch (error) {
            console.error('Error setting tanktype:', error);
        }
    }

    async getCurrentUserMoney(): Promise<number | null> {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            console.warn('Cannot get money: No user is signed in');
            return null;
        }
        try {
            const snapshot = await database.ref(`users/${currentUser.uid}/money`).once('value');
            const money = snapshot.val();
            return typeof money === 'number' ? money : null;
        } catch (error) {
            console.error('Error getting money:', error);
            return null;
        }
    }
}

const socialService = new SocialService();
export default socialService;
