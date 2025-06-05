import { _decorator, Component, Button, director, Node, Label } from 'cc';
import databaseService from '../../firebase/database-service';
import { FISH_LIST } from '../../FishData';

const { ccclass, property } = _decorator;

@ccclass('BattleModeButton')
export class BattleModeButton extends Component {
    @property(Button)
    battleButton: Button = null!;

    @property(Node)
    battleModePanel: Node = null!;

    @property(Button)
    quickMatchButton: Button = null!;

    @property(Button)
    rankedMatchButton: Button = null!;

    @property(Button)
    closeBattlePanelButton: Button = null!;

    @property(Label)
    playerLevelLabel: Label = null!;

    @property(Label)
    winRateLabel: Label = null!;

    @property(Label)
    lotteryTicketsLabel: Label = null!;

    start() {
        this.setupButtonCallbacks();
        this.hideBattlePanel();
        this.updatePlayerStats();
    }

    private setupButtonCallbacks(): void {
        if (this.battleButton) {
            this.battleButton.node.on(Button.EventType.CLICK, this.onBattleButtonClicked, this);
        }

        if (this.quickMatchButton) {
            this.quickMatchButton.node.on(Button.EventType.CLICK, this.onQuickMatchClicked, this);
        }

        if (this.rankedMatchButton) {
            this.rankedMatchButton.node.on(Button.EventType.CLICK, this.onRankedMatchClicked, this);
        }

        if (this.closeBattlePanelButton) {
            this.closeBattlePanelButton.node.on(Button.EventType.CLICK, this.onCloseBattlePanelClicked, this);
        }
    }

    private onBattleButtonClicked(): void {
        this.showBattlePanel();
    } private async onQuickMatchClicked(): Promise<void> {
        console.log('Starting quick match...');
        await this.startBattleMode('quick');
    }

    private async onRankedMatchClicked(): Promise<void> {
        console.log('Starting ranked match...');
        await this.startBattleMode('ranked');
    } private onCloseBattlePanelClicked(): void {
        this.hideBattlePanel();
    } private async startBattleMode(mode: 'quick' | 'ranked'): Promise<void> {
        // Validate player has fish for battle
        const isReady = await this.validatePlayerReadiness();
        if (!isReady) {
            this.showError('You need fish with a total attack+HP of at least 1 to participate in battles!');
            return;
        }

        // Store battle mode preference
        this.storeBattleMode(mode);

        // Load battle scene
        director.loadScene('battle');
    }

    private async validatePlayerReadiness(): Promise<boolean> {
        try {
            // Get player's fish from database
            const fishData = await databaseService.getSavedFish();
            if (!fishData || fishData.length === 0) {
                return false;
            }

            // Calculate total attack + HP among all fish
            let totalBattleStats = 0;

            for (const fish of fishData) {
                // Find fish definition in FISH_LIST
                const fishDefinition = FISH_LIST.find(f => f.id === fish.type);
                if (fishDefinition) {
                    // Add attack HP (or defense HP if no attack HP) + attack damage
                    const hp = fishDefinition.attackHP || fishDefinition.defenseHP || 0;
                    const damage = fishDefinition.attackDamage || 0;
                    totalBattleStats += hp + damage;
                }
            }

            console.log(`Player total battle stats: ${totalBattleStats}`);
            return totalBattleStats > 1;
        } catch (error) {
            console.error('Error validating player readiness:', error);
            return false;
        }
    }

    private storeBattleMode(mode: 'quick' | 'ranked'): void {
        // Store the selected battle mode for the battle scene to use
        localStorage.setItem('battleMode', mode);
    }

    private showBattlePanel(): void {
        if (this.battleModePanel) {
            this.battleModePanel.active = true;
            this.updatePlayerStats();
        }
    }

    private hideBattlePanel(): void {
        if (this.battleModePanel) {
            this.battleModePanel.active = false;
        }
    } private async updatePlayerStats(): Promise<void> {
        // Get actual player stats from Firebase
        const playerStats = await this.getPlayerBattleStats();

        if (this.playerLevelLabel) {
            this.playerLevelLabel.string = `Level: ${playerStats.level}`;
        }

        if (this.winRateLabel) {
            this.winRateLabel.string = `Win Rate: ${playerStats.winRate}%`;
        }

        if (this.lotteryTicketsLabel) {
            this.lotteryTicketsLabel.string = `Tickets: ${playerStats.lotteryTickets}`;
        }
    }

    private async getPlayerBattleStats(): Promise<{ level: number, winRate: number, lotteryTickets: number }> {
        try {
            // Get real battle stats from Firebase
            const battleStats = await databaseService.getBattleStats();

            if (battleStats) {
                return {
                    level: battleStats.level,
                    winRate: battleStats.winRate,
                    lotteryTickets: battleStats.lotteryTickets
                };
            } else {
                // Return default stats if none exist
                return {
                    level: 1,
                    winRate: 0,
                    lotteryTickets: 0
                };
            }
        } catch (error) {
            console.error('Error getting battle stats:', error);
            // Return fallback stats on error
            return {
                level: 1,
                winRate: 0,
                lotteryTickets: 0
            };
        }
    } private showError(message: string): void {
        // Log error for debugging
        console.error(message);

        // Show user-friendly error message
        // TODO: Implement proper error popup UI
        // For now, just use alert as a temporary solution
        if (typeof window !== 'undefined' && window.alert) {
            window.alert(message);
        }
    }

    public static getBattleMode(): 'quick' | 'ranked' | null {
        const mode = localStorage.getItem('battleMode');
        return mode as 'quick' | 'ranked' | null;
    }

    public static clearBattleMode(): void {
        localStorage.removeItem('battleMode');
    }

    /**
     * Record a battle result (to be called from battle scene)
     * This is a static method so it can be called from anywhere
     */
    public static async recordBattleResult(won: boolean): Promise<void> {
        try {
            const battleMode = BattleModeButton.getBattleMode();
            if (battleMode) {
                await databaseService.recordBattleResult(won, battleMode);
                console.log(`Battle result recorded: ${won ? 'Victory' : 'Defeat'} in ${battleMode} mode`);
            } else {
                console.warn('No battle mode found when recording result');
            }
        } catch (error) {
            console.error('Error recording battle result:', error);
        }
    }
}
