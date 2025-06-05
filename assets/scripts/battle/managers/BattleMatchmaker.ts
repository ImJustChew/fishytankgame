import { _decorator, Component } from 'cc';
import databaseService from '../../firebase/database-service';
import authService from '../../firebase/auth-service';

const { ccclass } = _decorator;

export interface MatchRequest {
    playerId: string;
    playerLevel: number;
    timestamp: number;
}

export interface MatchResult {
    matchId: string;
    opponentId: string;
    opponentData: {
        level: number;
        tankSize: string;
        fishCollection: string[];
    };
}

@ccclass('BattleMatchmaker')
export class BattleMatchmaker extends Component {
    private static readonly LEVEL_TOLERANCE = 5; // Allow +/- 5 levels

    private currentRequest: MatchRequest | null = null;
    private matchmakingPromise: Promise<MatchResult> | null = null;

    public async findMatch(): Promise<MatchResult> {
        if (this.matchmakingPromise) {
            return this.matchmakingPromise;
        }

        this.matchmakingPromise = this.startMatchmaking();

        try {
            const result = await this.matchmakingPromise;
            return result;
        } finally {
            this.matchmakingPromise = null;
            this.currentRequest = null;
        }
    } private async startMatchmaking(): Promise<MatchResult> {
        console.log('Starting matchmaking...');

        // Get current player info
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            throw new Error('No user logged in');
        } let userData = await databaseService.getUserData();
        if (!userData || !userData.battleStats) {
            // user is new or has no battle stats, create default stats
            console.log('No battle stats found, initializing default stats');
            await databaseService.initializeBattleStats(currentUser.uid);
            // Refetch user data after initialization
            userData = await databaseService.getUserData();
        }

        // Ensure we have battle stats before proceeding
        const playerLevel = userData?.battleStats?.level || 1;

        // Find an opponent directly without approval system
        const opponentResult = await this.findDirectOpponent(playerLevel);

        if (!opponentResult) {
            throw new Error('No suitable opponent found');
        }

        return opponentResult;
    } private async findDirectOpponent(playerLevel: number): Promise<MatchResult | null> {
        try {
            console.log('Finding direct opponent...');

            // Get all users with battle stats to find suitable opponents
            const potentialOpponents = await this.findSuitableOpponents(playerLevel);

            if (potentialOpponents.length === 0) {
                console.log('No suitable opponents found, generating AI opponent');
                return this.generateAIOpponent(playerLevel);
            }

            // Select a random opponent from suitable candidates
            const randomOpponent = potentialOpponents[Math.floor(Math.random() * potentialOpponents.length)];

            // Check if this is a real opponent (has a real UID) or a mock/AI opponent
            const isAIOpponent = randomOpponent.uid.startsWith('opponent_');

            let fishCollection: string[] = [];

            if (isAIOpponent) {
                // For AI opponents, generate a mock fish collection instead of querying database
                console.log(`Generating fish collection for AI opponent: ${randomOpponent.uid}`);
                fishCollection = this.generateOpponentFishCollection();
            } else {
                // For real opponents, get their actual fish collection from database
                console.log(`Fetching fish collection for real opponent: ${randomOpponent.uid}`);
                const opponentFish = await databaseService.getFishByUid(randomOpponent.uid);
                fishCollection = opponentFish ? opponentFish.map(fish => fish.type) : [];
            }

            return {
                matchId: this.generateMatchId(),
                opponentId: randomOpponent.uid,
                opponentData: {
                    level: randomOpponent.battleStats.level,
                    tankSize: 'medium', // Default for now
                    fishCollection: fishCollection
                }
            };

        } catch (error) {
            console.error('Error finding direct opponent:', error);
            // Fallback to AI opponent
            return this.generateAIOpponent(playerLevel);
        }
    }

    private async findSuitableOpponents(playerLevel: number): Promise<Array<{ uid: string, battleStats: any }>> {
        try {
            // This would ideally query Firebase for users with similar levels
            // For now, we'll simulate this by generating mock opponents
            // In a real implementation, you'd have a collection of user battle stats

            const mockOpponents = [];
            const numOpponents = Math.floor(Math.random() * 5) + 1; // 1-5 potential opponents

            for (let i = 0; i < numOpponents; i++) {
                const levelVariation = (Math.random() - 0.5) * (BattleMatchmaker.LEVEL_TOLERANCE * 2);
                const opponentLevel = Math.max(1, Math.round(playerLevel + levelVariation));

                mockOpponents.push({
                    uid: `opponent_${i}_${Date.now()}`,
                    battleStats: {
                        level: opponentLevel,
                        winRate: Math.floor(Math.random() * 100),
                        totalBattles: Math.floor(Math.random() * 50)
                    }
                });
            }

            return mockOpponents;
        } catch (error) {
            console.error('Error finding suitable opponents:', error);
            return [];
        }
    }

    private generateAIOpponent(playerLevel: number): MatchResult {
        console.log('Generating AI opponent for level', playerLevel);

        return {
            matchId: this.generateMatchId(),
            opponentId: this.generateOpponentId(),
            opponentData: {
                level: this.generateOpponentLevel(playerLevel),
                tankSize: 'medium',
                fishCollection: this.generateOpponentFishCollection()
            }
        };
    } private async cancelMatchmaking(): Promise<void> {
        console.log('Canceling matchmaking...');
        // No longer need to delete match requests since we don't create them
        this.currentRequest = null;
    } private generateMatchId(): string {
        return 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    private generateOpponentId(): string {
        return 'opponent_' + Math.random().toString(36).substr(2, 9);
    } private generateOpponentLevel(baseLevel?: number): number {
        const playerLevel = baseLevel || this.currentRequest?.playerLevel || 1;

        const minLevel = Math.max(1, playerLevel - BattleMatchmaker.LEVEL_TOLERANCE);
        const maxLevel = playerLevel + BattleMatchmaker.LEVEL_TOLERANCE;

        return Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
    } private generateOpponentFishCollection(): string[] {
        // Generate a random collection of fish IDs - using correct IDs from FishData.ts
        const allFishIds = ['fish_001', 'fish_002', 'fish_003', 'fish_004', 'fish_005', 'fish_006', 'fish_007', 'fish_008', 'fish_0009'];
        const collectionSize = Math.floor(Math.random() * 10) + 5; // 5-15 fish

        const collection: string[] = [];
        for (let i = 0; i < collectionSize; i++) {
            const randomFish = allFishIds[Math.floor(Math.random() * allFishIds.length)];
            collection.push(randomFish);
        }

        return collection;
    } public isMatchmaking(): boolean {
        return this.matchmakingPromise !== null;
    }

    public cancelCurrentMatch(): void {
        if (this.matchmakingPromise) {
            this.cancelMatchmaking();
            this.matchmakingPromise = null;
            this.currentRequest = null;
        }
    }
}
