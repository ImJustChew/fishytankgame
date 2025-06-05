import { _decorator, Component, Node, Vec3, director, Scene } from 'cc';
import { BattleTankManager } from './BattleTankManager';
import { BattleMatchmaker } from './BattleMatchmaker';
import { CombatManager } from '../systems/CombatManager';
import { VictoryConditions } from '../systems/VictoryConditions';
import { BattleHUD } from '../ui/BattleHUD';
import { FishDeploymentPanel } from '../components/FishDeploymentPanel';
import { BattleResult, MatchRecord } from '../data/BattleFishData';
import { BattleConfig } from '../data/BattleConfig';
import { VictoryScreen } from '../ui/VictoryScreen';
import { RewardDistribution } from '../ui/RewardDistribution';
import { FishManager } from '../../FishManager';
import databaseService from '../../firebase/database-service';
import authService from '../../firebase/auth-service';
import { BattleModeButton } from '../ui/BattleModeButton';
import { BattleFish } from '../components/BattleFish';

const { ccclass, property } = _decorator;

export enum BattlePhase {
    MATCHMAKING = 'matchmaking',
    LOADING = 'loading',
    DEPLOYMENT = 'deployment',
    COMBAT = 'combat',
    VICTORY = 'victory',
    SUMMARY = 'summary'
}

@ccclass('BattleSceneManager')
export class BattleSceneManager extends Component {
    @property(BattleTankManager)
    battleTankManager: BattleTankManager = null!;

    @property(CombatManager)
    combatManager: CombatManager = null!;

    @property(VictoryConditions)
    victoryConditions: VictoryConditions = null!;

    @property(BattleHUD)
    battleHUD: BattleHUD = null!;

    @property(FishDeploymentPanel)
    deploymentPanel: FishDeploymentPanel = null!;

    @property(VictoryScreen)
    victoryScreen: VictoryScreen = null!;

    @property(RewardDistribution)
    rewardDistribution: RewardDistribution = null!;

    @property(FishManager)
    fishManager: FishManager = null!;

    private currentPhase: BattlePhase = BattlePhase.MATCHMAKING;
    private matchmaker: BattleMatchmaker = null!;
    private battleStartTime: number = 0;
    private opponentId: string = '';
    private matchId: string = '';
    private opponentFishCollection: string[] = [];

    start() {
        this.initializeBattle();
    }

    private async initializeBattle() {
        // Initialize matchmaker
        this.matchmaker = new BattleMatchmaker();

        // Set up component references
        this.setupComponentReferences();

        // Start matchmaking
        await this.startMatchmaking();
    }

    private setupComponentReferences() {
        // Connect FishManager to components that need fish sprites
        if (this.fishManager) {
            this.battleTankManager.fishManager = this.fishManager;
            this.deploymentPanel.fishManager = this.fishManager;
            console.log('Connected FishManager to battle components');
        } else {
            console.error('FishManager not assigned to BattleSceneManager');
        }

        // Connect combat manager to battle tank manager
        this.combatManager.setBattleTankManager(this.battleTankManager);

        // Connect victory conditions
        this.victoryConditions.setCombatManager(this.combatManager);
        this.victoryConditions.setOnVictoryCallback(this.onBattleEnd.bind(this));

        // Connect deployment panel
        this.deploymentPanel.setTankManager(this.battleTankManager);
        this.deploymentPanel.setBattleSceneManager(this);

        // Connect HUD
        this.battleHUD.setCombatManager(this.combatManager);
        this.battleHUD.setVictoryConditions(this.victoryConditions);
    }

    private async startMatchmaking() {
        this.setPhase(BattlePhase.MATCHMAKING);
        this.battleHUD.showMatchmakingUI();

        try {
            const matchResult = await this.matchmaker.findMatch();
            this.opponentId = matchResult.opponentId;
            this.matchId = matchResult.matchId;
            this.opponentFishCollection = matchResult.opponentData.fishCollection;

            // Update HUD with opponent info
            this.battleHUD.setOpponentInfo(this.opponentId, matchResult.opponentData);

            await this.startBattle();
        } catch (error) {
            console.error('Matchmaking failed:', error);
            this.battleHUD.showMatchmakingError();
        }
    }

    private async startBattle() {
        this.setPhase(BattlePhase.LOADING);
        this.battleHUD.showLoadingUI();

        // Initialize battle systems
        await this.initializeBattleSystems();        // Start deployment phase
        this.setPhase(BattlePhase.DEPLOYMENT);
        this.battleStartTime = Date.now();
        this.battleHUD.showBattleUI();

        // Enable deployment with debugging
        this.deploymentPanel.enableDeploymentAndDebug();

        // Auto-transition to combat after deployment time
        this.scheduleOnce(() => {
            this.startCombatPhase();
        }, BattleConfig.DEPLOYMENT_TIME);
    } private async initializeBattleSystems() {
        // Initialize the single battle tank for both player and opponent fish
        // Pass the opponent fish collection to the tank manager
        this.battleTankManager.initializeForBattle(true, this.opponentFishCollection);

        // Initialize combat system
        this.combatManager.initializeBattle();

        // Initialize victory conditions
        this.victoryConditions.initializeBattle();
    } private startCombatPhase() {
        this.setPhase(BattlePhase.COMBAT);
        this.deploymentPanel.disableDeployment();
        this.combatManager.startCombat();
        this.victoryConditions.startTracking();
    }

    private onBattleEnd(result: BattleResult) {
        this.setPhase(BattlePhase.VICTORY);
        this.combatManager.stopCombat();
        this.deploymentPanel.disableDeployment();
        // Show victory screen
        this.victoryScreen.showResult(result);
        this.victoryScreen.addContinueListener(() => {
            this.showBattleSummary(result);
        });
    }

    private async showBattleSummary(result: BattleResult) {
        this.setPhase(BattlePhase.SUMMARY);

        // Create match record
        const matchRecord = this.createMatchRecord(result);

        // Calculate and distribute rewards
        const rewards = await this.rewardDistribution.calculateRewards(result, matchRecord);

        // Show summary screen
        this.battleHUD.showSummaryUI(matchRecord, rewards);

        // Save match to Firebase
        await this.saveMatchRecord(matchRecord);

        // Update player collection
        await this.updatePlayerCollection(result);
    } private createMatchRecord(result: BattleResult): MatchRecord {
        const battleDuration = Date.now() - this.battleStartTime;
        const currentUser = authService.getCurrentUser();

        return {
            matchId: this.matchId,
            timestamp: Date.now(),
            players: {
                player1: {
                    playerId: currentUser?.uid || 'unknown_player',
                    fishDeployed: this.battleTankManager.getPlayerMatchDeployedFishRecords(),
                    fishLost: result.playerFishLost,
                    damageDealt: this.combatManager.getPlayerDamageDealt(),
                    damageReceived: this.combatManager.getPlayerDamageReceived(),
                    achievements: result.achievementsEarned
                },
                player2: {
                    playerId: this.opponentId,
                    fishDeployed: this.battleTankManager.getOpponentMatchDeployedFishRecords(),
                    fishLost: result.opponentFishLost,
                    damageDealt: this.combatManager.getOpponentDamageDealt(),
                    damageReceived: this.combatManager.getOpponentDamageReceived(),
                    achievements: []
                }
            },
            result: {
                ...result,
                battleDuration: battleDuration
            }
        };
    } private async saveMatchRecord(matchRecord: MatchRecord): Promise<void> {
        try {
            // Save match record to Firebase
            await databaseService.saveMatchRecord(matchRecord);
            console.log('Match record saved successfully:', matchRecord.matchId);
        } catch (error) {
            console.error('Failed to save match record:', error);
            // Don't throw error to avoid breaking game flow
        }
    } private async updatePlayerCollection(result: BattleResult): Promise<void> {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                console.warn('Cannot update player collection: No user logged in');
                return;
            }

            // Get fish that were lost in battle
            const playerFishLost = result.playerFishLost || [];
            // Remove permanently lost fish from player inventory
            for (const fishId of playerFishLost) {
                try {
                    await databaseService.removeFish(fishId);
                    console.log(`Removed lost fish ${fishId} from player collection`);
                } catch (error) {
                    console.error(`Failed to remove fish ${fishId}:`, error);
                }
            }

            // Note: In this battle system, defending fish return to their tank
            // so no additional logic needed for returning survivor fish

            console.log('Player collection updated successfully');
        } catch (error) {
            console.error('Failed to update player collection:', error);
            // Don't throw error to avoid breaking game flow
        }
    } public deployFish(fishId: string, position: Vec3): boolean {
        if (this.currentPhase !== BattlePhase.DEPLOYMENT && this.currentPhase !== BattlePhase.COMBAT) {
            return false;
        }

        return this.battleTankManager.deployFish(fishId, position);
    }

    public forfeitBattle() {
        const result: BattleResult = {
            winner: 'opponent',
            playerFishLost: this.battleTankManager.getPlayerDeployedFishIds(),
            opponentFishLost: [],
            battleDuration: Date.now() - this.battleStartTime,
            totalDamageDealt: this.combatManager.getPlayerDamageDealt(),
            achievementsEarned: [],
            lotteryTicketsEarned: BattleConfig.REWARDS.FORFEIT_TICKETS
        };

        this.onBattleEnd(result);
    }

    public returnToMainMenu() {
        // TODO: Load main scene
        director.loadScene('main');
    }

    public startNewBattle() {
        // Reset all systems and start new matchmaking
        this.resetBattleSystems();
        this.startMatchmaking();
    } private resetBattleSystems() {
        this.combatManager.reset();
        this.victoryConditions.reset();
        this.battleTankManager.reset();
        this.deploymentPanel.reset();
        this.battleHUD.reset();
    }

    private setPhase(phase: BattlePhase) {
        this.currentPhase = phase;
        console.log(`Battle phase changed to: ${phase}`);
    } public getCurrentPhase(): BattlePhase {
        return this.currentPhase;
    }

    /**
     * Toggle hitbox visualization for debugging
     * This makes fish hitboxes visible to help diagnose collision issues
     */
    public toggleHitboxDebug(): void {
        BattleFish.showHitboxes = !BattleFish.showHitboxes;
        console.log(`Hitbox debug mode: ${BattleFish.showHitboxes ? 'ON' : 'OFF'}`);

        // Log all battle fish to check their hitboxes
        const allFish = this.battleTankManager.getAllBattleFish();
        console.log(`Toggling debug hitboxes for ${allFish.length} battle fish`);
    }

    /**
     * Debug utility to test all fish collisions
     * Call this from the console for debugging
     */
    public testAllFishCollisions(): void {
        console.log("Testing all fish collisions...");
        const allFish = this.battleTankManager.getAllBattleFish();
        let totalCollisions = 0;

        allFish.forEach(fish => {
            const collisions = fish.getCollidingFish();
            if (collisions.length > 0) {
                console.log(`Fish ${fish.getInstanceId()} (${fish.getOwner()} ${fish.getRole()}) collides with ${collisions.length} fish`);
                totalCollisions += collisions.length;
            }
        });

        console.log(`Total collisions found: ${totalCollisions / 2}`);  // Divide by 2 since each collision is counted twice
    }
}
