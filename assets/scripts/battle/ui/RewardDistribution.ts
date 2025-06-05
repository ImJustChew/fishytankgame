import { _decorator, Component, Label, Button, Node, Layout, instantiate, Prefab } from 'cc';
import { BattleResult, MatchRecord } from '../data/BattleFishData';
import { BattleConfig } from '../data/BattleConfig';
import databaseService from '../../firebase/database-service';
import authService from '../../firebase/auth-service';

const { ccclass, property } = _decorator;

export interface RewardInfo {
    lotteryTickets: number;
    achievements: string[];
    bonusTickets: number;
    totalTickets: number;
}

@ccclass('RewardDistribution')
export class RewardDistribution extends Component {
    @property(Node)
    rewardPanel: Node = null!;

    @property(Label)
    baseRewardLabel: Label = null!;

    @property(Label)
    bonusRewardLabel: Label = null!;

    @property(Label)
    totalRewardLabel: Label = null!;

    @property(Node)
    achievementRewardsContainer: Node = null!;

    @property(Prefab)
    achievementRewardPrefab: Prefab = null!;

    @property(Button)
    claimRewardsButton: Button = null!; @property(Node)
    ticketAnimation: Node = null!;

    private currentRewards: RewardInfo | null = null;

    start() {
        this.setupButtonCallbacks();
        this.hideRewardPanel();
    }

    private setupButtonCallbacks(): void {
        if (this.claimRewardsButton) {
            this.claimRewardsButton.node.on(Button.EventType.CLICK, this.onClaimRewardsClicked, this);
        }
    }

    public async calculateRewards(battleResult: BattleResult, matchRecord: MatchRecord): Promise<RewardInfo> {
        const isVictory = battleResult.winner === 'player';

        // Base reward calculation
        const baseTickets = this.calculateBaseReward(isVictory);

        // Performance bonuses
        const performanceBonus = this.calculatePerformanceBonus(battleResult, matchRecord);

        // Achievement bonuses
        const achievementBonus = this.calculateAchievementBonus(battleResult.achievementsEarned);

        // Time bonuses
        const timeBonus = this.calculateTimeBonus(battleResult.battleDuration, isVictory);

        // Streak bonuses (would need to be tracked)
        const streakBonus = await this.calculateStreakBonus();

        const totalBonusTickets = performanceBonus + achievementBonus + timeBonus + streakBonus;
        const totalTickets = baseTickets + totalBonusTickets;

        const rewardInfo: RewardInfo = {
            lotteryTickets: baseTickets,
            achievements: battleResult.achievementsEarned,
            bonusTickets: totalBonusTickets,
            totalTickets: totalTickets
        };

        // Display rewards
        this.displayRewards(rewardInfo, battleResult);

        return rewardInfo;
    }

    private calculateBaseReward(isVictory: boolean): number {
        return isVictory ? BattleConfig.REWARDS.WIN_TICKETS : BattleConfig.REWARDS.LOSS_TICKETS;
    }

    private calculatePerformanceBonus(battleResult: BattleResult, matchRecord: MatchRecord): number {
        let bonus = 0;
        const playerData = matchRecord.players.player1;

        // Kill bonus
        const kills = battleResult.opponentFishLost.length;
        bonus += kills * BattleConfig.REWARDS.KILL_BONUS_TICKETS;

        // Damage bonus (for high damage dealers)
        const damageThreshold = 500; // Adjustable threshold
        if (playerData.damageDealt >= damageThreshold) {
            bonus += Math.floor(playerData.damageDealt / damageThreshold) * 2;
        }

        // Survival bonus (for keeping fish alive)
        const fishSurvived = playerData.fishDeployed.length - battleResult.playerFishLost.length;
        bonus += fishSurvived * 1; // 1 ticket per surviving fish

        return bonus;
    }

    private calculateAchievementBonus(achievements: string[]): number {
        let bonus = 0;

        achievements.forEach(achievementId => {
            switch (achievementId) {
                case 'quick_victory':
                    bonus += 5;
                    break;
                case 'perfect_victory':
                    bonus += 10;
                    break;
                case 'fish_slayer':
                    bonus += 8;
                    break;
                case 'damage_dealer':
                    bonus += 6;
                    break;
                case 'first_blood':
                    bonus += 3;
                    break;
                default:
                    bonus += 2; // Default achievement bonus
                    break;
            }
        });

        return bonus;
    }

    private calculateTimeBonus(battleDuration: number, isVictory: boolean): number {
        if (!isVictory) {
            return 0;
        }

        // Bonus for quick victories
        const quickVictoryThreshold = 120000; // 2 minutes
        const superQuickThreshold = 60000; // 1 minute

        if (battleDuration <= superQuickThreshold) {
            return 8; // Super quick victory
        } else if (battleDuration <= quickVictoryThreshold) {
            return 5; // Quick victory
        }

        return 0;
    }

    private async calculateStreakBonus(): Promise<number> {
        // TODO: Implement streak tracking from Firebase
        // For now, return random bonus to simulate streaks
        const currentStreak = Math.floor(Math.random() * 5); // 0-4 streak

        if (currentStreak >= 3) {
            return currentStreak * 2; // 2 tickets per win in streak of 3+
        }

        return 0;
    } private displayRewards(rewardInfo: RewardInfo, battleResult: BattleResult): void {
        // Store rewards for later claiming
        this.currentRewards = rewardInfo;

        this.showRewardPanel();

        // Update base reward display
        if (this.baseRewardLabel) {
            const isVictory = battleResult.winner === 'player';
            this.baseRewardLabel.string = `${isVictory ? 'Victory' : 'Participation'}: ${rewardInfo.lotteryTickets} tickets`;
        }

        // Update bonus reward display
        if (this.bonusRewardLabel) {
            this.bonusRewardLabel.string = `Performance Bonus: +${rewardInfo.bonusTickets} tickets`;
        }

        // Update total reward display
        if (this.totalRewardLabel) {
            this.totalRewardLabel.string = `Total: ${rewardInfo.totalTickets} lottery tickets`;
        }

        // Display achievement rewards
        this.displayAchievementRewards(rewardInfo.achievements);

        // Animate ticket display
        this.animateTicketReward(rewardInfo.totalTickets);
    }

    private displayAchievementRewards(achievements: string[]): void {
        if (!this.achievementRewardsContainer) {
            return;
        }

        // Clear existing achievement displays
        this.achievementRewardsContainer.removeAllChildren();

        if (achievements.length === 0) {
            this.achievementRewardsContainer.active = false;
            return;
        }

        this.achievementRewardsContainer.active = true;

        achievements.forEach(achievementId => {
            this.createAchievementRewardDisplay(achievementId);
        });
    }

    private createAchievementRewardDisplay(achievementId: string): void {
        if (!this.achievementRewardPrefab || !this.achievementRewardsContainer) {
            return;
        }

        const rewardNode = instantiate(this.achievementRewardPrefab);
        this.achievementRewardsContainer.addChild(rewardNode);

        // Configure achievement reward display
        const achievementInfo = this.getAchievementInfo(achievementId);
        const bonusTickets = this.getAchievementTicketValue(achievementId);

        // TODO: Set achievement icon, name, and ticket value on the prefab
        console.log(`Achievement reward: ${achievementInfo.name} (+${bonusTickets} tickets)`);
    }

    private getAchievementInfo(achievementId: string): { name: string, description: string } {
        const achievements: { [key: string]: { name: string, description: string } } = {
            'quick_victory': {
                name: 'Speed Demon',
                description: 'Win a battle in under 2 minutes'
            },
            'perfect_victory': {
                name: 'Flawless',
                description: 'Win without losing any fish'
            },
            'fish_slayer': {
                name: 'Fish Slayer',
                description: 'Defeat 5 or more enemy fish in one battle'
            },
            'damage_dealer': {
                name: 'Heavy Hitter',
                description: 'Deal massive damage in a single battle'
            },
            'first_blood': {
                name: 'First Blood',
                description: 'Score the first kill of the battle'
            }
        };

        return achievements[achievementId] || { name: 'Unknown', description: 'Unknown achievement' };
    }

    private getAchievementTicketValue(achievementId: string): number {
        const values: { [key: string]: number } = {
            'quick_victory': 5,
            'perfect_victory': 10,
            'fish_slayer': 8,
            'damage_dealer': 6,
            'first_blood': 3
        };

        return values[achievementId] || 2;
    }

    private animateTicketReward(totalTickets: number): void {
        if (!this.ticketAnimation) {
            return;
        }

        // TODO: Implement ticket animation
        // This could involve counting up numbers, particle effects, etc.
        console.log(`Animating ${totalTickets} lottery tickets`);

        // Simple animation placeholder
        this.ticketAnimation.active = true;
        this.scheduleOnce(() => {
            this.ticketAnimation.active = false;
        }, 2);
    } private async onClaimRewardsClicked(): Promise<void> {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                console.warn('Cannot claim rewards: No user logged in');
                return;
            }

            if (!this.currentRewards) {
                console.warn('No rewards to claim');
                return;
            }

            // Grant lottery tickets to player account
            if (this.currentRewards.totalTickets > 0) {
                await databaseService.addLotteryTickets(this.currentRewards.totalTickets);
                console.log(`Granted ${this.currentRewards.totalTickets} lottery tickets to player`);
            }

            // Save newly earned achievements to Firebase
            if (this.currentRewards.achievements.length > 0) {
                // TODO: Implement achievement system integration
                console.log('Achievements earned:', this.currentRewards.achievements);
            }

            // TODO: Update win streak in Firebase (if implementing streak system)

            console.log('Rewards claimed successfully');
            this.hideRewardPanel();
        } catch (error) {
            console.error('Error claiming rewards:', error);
            // Show error message to user but don't break the flow
            this.hideRewardPanel();
        }
    }

    private showRewardPanel(): void {
        if (this.rewardPanel) {
            this.rewardPanel.active = true;
        }
    }

    private hideRewardPanel(): void {
        if (this.rewardPanel) {
            this.rewardPanel.active = false;
        }
    }

    // Special reward calculations
    public calculateDailyBonusMultiplier(): number {
        // TODO: Check if player has daily bonus active
        return 1.0; // No bonus by default
    }

    public calculatePremiumMultiplier(): number {
        // TODO: Check if player has premium account
        return 1.0; // No bonus by default
    }

    public calculateEventMultiplier(): number {
        // TODO: Check for active events
        return 1.0; // No bonus by default
    }

    // Lottery ticket utility methods
    public async grantLotteryTickets(amount: number): Promise<void> {
        // TODO: Add tickets to player's account
        console.log(`Granting ${amount} lottery tickets to player`);
    }

    public async checkPlayerTicketBalance(): Promise<number> {
        // TODO: Get current ticket balance from Firebase
        return 0; // Placeholder
    }

    // Achievement tracking
    public async saveAchievements(achievements: string[]): Promise<void> {
        // TODO: Save newly earned achievements to Firebase
        console.log('Saving achievements:', achievements);
    }

    // Streak tracking
    public async updateWinStreak(isVictory: boolean): Promise<number> {
        // TODO: Update win streak in Firebase
        console.log(`Updating win streak (victory: ${isVictory})`);
        return 0; // Placeholder
    }

    public reset(): void {
        this.hideRewardPanel();

        if (this.achievementRewardsContainer) {
            this.achievementRewardsContainer.removeAllChildren();
        }

        if (this.ticketAnimation) {
            this.ticketAnimation.active = false;
        }
    }
}
