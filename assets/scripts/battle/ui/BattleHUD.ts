import { _decorator, Component, Node, Label, ProgressBar, Button, director } from 'cc';
import { CombatManager } from '../systems/CombatManager';
import { VictoryConditions } from '../systems/VictoryConditions';
import { MatchRecord } from '../data/BattleFishData';
import { BattleSceneManager } from '../managers/BattleSceneManager';
import { BattleFish } from '../components/BattleFish';

const { ccclass, property } = _decorator;

@ccclass('BattleHUD')
export class BattleHUD extends Component {
    // Timer and Progress UI
    @property(Label)
    battleTimerLabel: Label = null!;

    @property(ProgressBar)
    battleProgressBar: ProgressBar = null!;

    // Player Status
    @property(Label)
    playerFishCountLabel: Label = null!;

    @property(ProgressBar)
    playerEliminationBar: ProgressBar = null!;

    @property(Label)
    playerDamageLabel: Label = null!;

    // Opponent Status
    @property(Label)
    opponentFishCountLabel: Label = null!;

    @property(ProgressBar)
    opponentEliminationBar: ProgressBar = null!;

    @property(Label)
    opponentDamageLabel: Label = null!;

    // Action Buttons
    @property(Button)
    forfeitButton: Button = null!;

    @property(Button)
    pauseButton: Button = null!;

    // Debug Controls
    @property(Button)
    debugToggleButton: Button = null!;

    // Phase-specific UI Panels
    @property(Node)
    matchmakingPanel: Node = null!;

    @property(Node)
    loadingPanel: Node = null!;

    @property(Node)
    battlePanel: Node = null!;

    @property(Node)
    summaryPanel: Node = null!;

    // Matchmaking UI
    @property(Label)
    matchmakingStatusLabel: Label = null!;

    @property(Button)
    cancelMatchmakingButton: Button = null!;

    // Summary UI
    @property(Label)
    summaryResultLabel: Label = null!;

    @property(Label)
    summaryStatsLabel: Label = null!;

    @property(Label)
    summaryRewardsLabel: Label = null!;

    @property(Button)
    newBattleButton: Button = null!;

    @property(Button)
    mainMenuButton: Button = null!;

    private combatManager: CombatManager = null!;
    private victoryConditions: VictoryConditions = null!;

    // Callbacks for scene manager communication
    private onForfeitCallback: (() => void) | null = null;
    private onCancelMatchmakingCallback: (() => void) | null = null;
    private onNewBattleCallback: (() => void) | null = null;
    private updateInterval: number = 0.1; // Update every 100ms

    start() {
        this.setupButtonCallbacks();
        this.hideAllPanels();
    }

    public setCombatManager(combatManager: CombatManager): void {
        this.combatManager = combatManager;
    }

    public setVictoryConditions(victoryConditions: VictoryConditions): void {
        this.victoryConditions = victoryConditions;
    }

    public setOpponentInfo(opponentId: string, opponentData: any): void {
        // For now, we'll just log this information
        // In a full implementation, this would update opponent display UI
        console.log(`Battle opponent: ${opponentId}`, opponentData);

        // If there are opponent info labels in the UI, they could be updated here
        // Example: this.opponentNameLabel.string = opponentData.username || opponentId;
    }

    public setForfeitCallback(callback: () => void): void {
        this.onForfeitCallback = callback;
    }

    public setCancelMatchmakingCallback(callback: () => void): void {
        this.onCancelMatchmakingCallback = callback;
    }

    public setNewBattleCallback(callback: () => void): void {
        this.onNewBattleCallback = callback;
    }

    private setupButtonCallbacks(): void {
        if (this.forfeitButton) {
            this.forfeitButton.node.on(Button.EventType.CLICK, this.onForfeitClicked, this);
        }

        if (this.pauseButton) {
            this.pauseButton.node.on(Button.EventType.CLICK, this.onPauseClicked, this);
        }

        if (this.cancelMatchmakingButton) {
            this.cancelMatchmakingButton.node.on(Button.EventType.CLICK, this.onCancelMatchmakingClicked, this);
        }

        if (this.newBattleButton) {
            this.newBattleButton.node.on(Button.EventType.CLICK, this.onNewBattleClicked, this);
        }
        
        if (this.debugToggleButton) {
            this.debugToggleButton.node.on(Button.EventType.CLICK, this.onDebugToggleClicked, this);
        }
    }

    public showMatchmakingUI(): void {
        this.hideAllPanels();
        if (this.matchmakingPanel) {
            this.matchmakingPanel.active = true;
            this.updateMatchmakingStatus('Searching for opponent...');
        }
    }

    public showLoadingUI(): void {
        this.hideAllPanels();
        if (this.loadingPanel) {
            this.loadingPanel.active = true;
        }
    }

    public showBattleUI(): void {
        this.hideAllPanels();
        if (this.battlePanel) {
            this.battlePanel.active = true;
            this.startBattleUpdates();
        }
    }

    public showSummaryUI(matchRecord: MatchRecord, rewards: any): void {
        this.hideAllPanels();
        this.stopBattleUpdates();

        if (this.summaryPanel) {
            this.summaryPanel.active = true;
            this.updateSummaryDisplay(matchRecord, rewards);
        }
    }

    public showMatchmakingError(): void {
        this.updateMatchmakingStatus('Failed to find match. Please try again.');
    }

    private hideAllPanels(): void {
        if (this.matchmakingPanel) this.matchmakingPanel.active = false;
        if (this.loadingPanel) this.loadingPanel.active = false;
        if (this.battlePanel) this.battlePanel.active = false;
        if (this.summaryPanel) this.summaryPanel.active = false;
    }

    private startBattleUpdates(): void {
        this.schedule(this.updateBattleDisplay, this.updateInterval);
    }

    private stopBattleUpdates(): void {
        this.unschedule(this.updateBattleDisplay);
    }

    private updateBattleDisplay(): void {
        if (!this.combatManager || !this.victoryConditions) {
            return;
        }

        this.updateTimer();
        this.updateProgressBars();
        this.updateFishCounts();
        this.updateDamageDisplays();
    }

    private updateTimer(): void {
        if (!this.battleTimerLabel || !this.victoryConditions) {
            return;
        }

        const timeRemaining = this.victoryConditions.getBattleTimeRemaining();
        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);
        const secondsStr = seconds < 10 ? '0' + seconds : seconds.toString();
        this.battleTimerLabel.string = `${minutes}:${secondsStr}`;
    }

    private updateProgressBars(): void {
        if (!this.victoryConditions) {
            return;
        }

        // Battle progress (time)
        if (this.battleProgressBar) {
            this.battleProgressBar.progress = this.victoryConditions.getBattleProgress();
        }

        // Elimination progress
        if (this.playerEliminationBar) {
            this.playerEliminationBar.progress = this.victoryConditions.getPlayerEliminationProgress();
        }

        if (this.opponentEliminationBar) {
            this.opponentEliminationBar.progress = this.victoryConditions.getOpponentEliminationProgress();
        }
    }

    private updateFishCounts(): void {
        if (!this.combatManager) {
            return;
        }

        const playerSurvivalRate = this.combatManager.getPlayerSurvivalRate();
        const opponentSurvivalRate = this.combatManager.getOpponentSurvivalRate();

        if (this.playerFishCountLabel) {
            this.playerFishCountLabel.string = `Survival: ${Math.round(playerSurvivalRate * 100)}%`;
        }

        if (this.opponentFishCountLabel) {
            this.opponentFishCountLabel.string = `Survival: ${Math.round(opponentSurvivalRate * 100)}%`;
        }
    }

    private updateDamageDisplays(): void {
        if (!this.combatManager) {
            return;
        }

        if (this.playerDamageLabel) {
            this.playerDamageLabel.string = `Damage: ${this.combatManager.getPlayerDamageDealt()}`;
        }

        if (this.opponentDamageLabel) {
            this.opponentDamageLabel.string = `Damage: ${this.combatManager.getOpponentDamageDealt()}`;
        }
    }

    private updateMatchmakingStatus(status: string): void {
        if (this.matchmakingStatusLabel) {
            this.matchmakingStatusLabel.string = status;
        }
    }

    private updateSummaryDisplay(matchRecord: MatchRecord, rewards: any): void {
        const result = matchRecord.result;
        const isVictory = result.winner === 'player';

        // Result display
        if (this.summaryResultLabel) {
            this.summaryResultLabel.string = isVictory ? 'VICTORY!' : 'DEFEAT';
            // TODO: Set color based on result
        }

        // Stats display
        if (this.summaryStatsLabel) {
            const duration = Math.round(result.battleDuration / 1000);
            const playerStats = matchRecord.players.player1;

            this.summaryStatsLabel.string =
                `Battle Duration: ${duration}s\n` +
                `Fish Lost: ${playerStats.fishLost.length}\n` +
                `Damage Dealt: ${playerStats.damageDealt}\n` +
                `Damage Received: ${playerStats.damageReceived}`;
        }

        // Rewards display
        if (this.summaryRewardsLabel) {
            this.summaryRewardsLabel.string =
                `Lottery Tickets: ${result.lotteryTicketsEarned}\n` +
                `Achievements: ${result.achievementsEarned.length}`;
        }
    }

    // Button callbacks
    private onForfeitClicked(): void {
        // Show confirmation dialog
        if (confirm && confirm('Are you sure you want to forfeit the battle? This will count as a loss.')) {
            if (this.onForfeitCallback) {
                this.onForfeitCallback();
            }
        }
    }

    private onPauseClicked(): void {
        // Simple pause implementation
        console.log('Battle paused');
        // TODO: Implement proper pause menu with resume/forfeit/settings options
    }

    private onCancelMatchmakingClicked(): void {
        if (this.onCancelMatchmakingCallback) {
            this.onCancelMatchmakingCallback();
        } else {
            // Fallback: return to main menu directly
            director.loadScene('main');
        }
    }

    private onNewBattleClicked(): void {
        if (this.onNewBattleCallback) {
            this.onNewBattleCallback();
        }
    }

    private onMainMenuClicked(): void {
        // Return to main menu
        director.loadScene('main');
    }    /**
     * Handle debug toggle button click
     * This toggles hitbox visualization for all fish to help diagnose collision issues
     */
    private onDebugToggleClicked(): void {
        // Get reference to the battle scene manager
        const battleSceneManager = this.node.getParent()?.getComponent(BattleSceneManager);
        if (battleSceneManager) {
            // Call the toggle debug method
            battleSceneManager.toggleHitboxDebug();
            
            // Update button text if it has a label child
            const buttonLabel = this.debugToggleButton.getComponentInChildren(Label);
            if (buttonLabel) {
                // Toggle the button text
                buttonLabel.string = BattleFish.showHitboxes ? "Hide Hitboxes" : "Show Hitboxes";
            }
        }
    }

    // Notification methods
    public showNotification(message: string, duration: number = 3000): void {
        // TODO: Show temporary notification overlay
        console.log(`Notification: ${message}`);
    }

    public showWarning(message: string): void {
        // TODO: Show warning overlay
        console.log(`Warning: ${message}`);
    }

    public showAchievement(achievementName: string): void {
        // TODO: Show achievement popup
        console.log(`Achievement unlocked: ${achievementName}`);
    }

    // Status indicators
    public setConnectionStatus(connected: boolean): void {
        // TODO: Update connection indicator
        console.log(`Connection status: ${connected ? 'Connected' : 'Disconnected'}`);
    }

    public showVictoryWarning(isClose: boolean): void {
        if (isClose && this.victoryConditions?.isVictoryClose()) {
            this.showNotification('Victory conditions are close!', 2000);
        }
    }

    public reset(): void {
        this.stopBattleUpdates();
        this.hideAllPanels();

        // Reset all displays to default values
        if (this.battleTimerLabel) this.battleTimerLabel.string = '5:00';
        if (this.battleProgressBar) this.battleProgressBar.progress = 0;
        if (this.playerEliminationBar) this.playerEliminationBar.progress = 0;
        if (this.opponentEliminationBar) this.opponentEliminationBar.progress = 0;
        if (this.playerFishCountLabel) this.playerFishCountLabel.string = 'Survival: 100%';
        if (this.opponentFishCountLabel) this.opponentFishCountLabel.string = 'Survival: 100%';
        if (this.playerDamageLabel) this.playerDamageLabel.string = 'Damage: 0';
        if (this.opponentDamageLabel) this.opponentDamageLabel.string = 'Damage: 0';
    }

    // Animation methods for visual feedback
    public animateHealthChange(isPlayer: boolean, healthChange: number): void {
        // TODO: Animate health bar changes
        console.log(`${isPlayer ? 'Player' : 'Opponent'} health changed by ${healthChange}`);
    }

    public animateKill(isPlayerKill: boolean): void {
        // TODO: Show kill notification animation
        console.log(`${isPlayerKill ? 'Player' : 'Opponent'} scored a kill!`);
    }

    public pulseProgressBar(progressBar: ProgressBar): void {
        // TODO: Add pulsing animation to indicate critical progress
        if (progressBar) {
            console.log('Progress bar pulsing animation');
        }
    }
}
