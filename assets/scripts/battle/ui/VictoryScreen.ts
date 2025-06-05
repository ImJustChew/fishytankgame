import { _decorator, Component, Node, Label, Button, Layout } from 'cc';
import { BattleResult } from '../data/BattleFishData';

const { ccclass, property } = _decorator;

@ccclass('VictoryScreen')
export class VictoryScreen extends Component {
    @property(Node)
    victoryPanel: Node = null!;

    @property(Node)
    defeatPanel: Node = null!;

    @property(Label)
    resultTitleLabel: Label = null!;

    @property(Label)
    resultSubtitleLabel: Label = null!;

    @property(Label)
    battleStatsLabel: Label = null!;

    @property(Label)
    rewardsLabel: Label = null!;

    @property(Node)
    achievementsContainer: Node = null!;

    @property(Button)
    continueButton: Button = null!;

    @property(Node)
    confettiEffect: Node = null!;

    public onContinue: Array<() => void> = [];

    start() {
        this.setupButtonCallbacks();
        this.hideVictoryScreen();
    }

    private setupButtonCallbacks(): void {
        if (this.continueButton) {
            this.continueButton.node.on(Button.EventType.CLICK, this.onContinueClicked, this);
        }
    }

    public showResult(battleResult: BattleResult): void {
        const isVictory = battleResult.winner === 'player';

        // Show appropriate panel
        this.showVictoryPanel(isVictory);

        // Update result display
        this.updateResultDisplay(battleResult, isVictory);

        // Update stats display
        this.updateStatsDisplay(battleResult);

        // Update rewards display
        this.updateRewardsDisplay(battleResult);

        // Show achievements
        this.updateAchievementsDisplay(battleResult.achievementsEarned);

        // Play effects
        if (isVictory) {
            this.playVictoryEffects();
        } else {
            this.playDefeatEffects();
        }
    }

    private showVictoryPanel(isVictory: boolean): void {
        if (this.victoryPanel) {
            this.victoryPanel.active = isVictory;
        }

        if (this.defeatPanel) {
            this.defeatPanel.active = !isVictory;
        }

        this.node.active = true;
    }

    private updateResultDisplay(battleResult: BattleResult, isVictory: boolean): void {
        if (this.resultTitleLabel) {
            this.resultTitleLabel.string = isVictory ? 'VICTORY!' : 'DEFEAT';
        }

        if (this.resultSubtitleLabel) {
            const subtitle = this.getResultSubtitle(battleResult, isVictory);
            this.resultSubtitleLabel.string = subtitle;
        }
    } private getResultSubtitle(battleResult: BattleResult, isVictory: boolean): string {
        const duration = Math.round(battleResult.battleDuration / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;

        const secondsStr = seconds < 10 ? '0' + seconds : seconds.toString();
        const timeStr = `${minutes}:${secondsStr}`;

        if (isVictory) {
            if (battleResult.playerFishLost.length === 0) {
                return `Perfect Victory in ${timeStr}!`;
            } else if (duration < 120) { // Less than 2 minutes
                return `Quick Victory in ${timeStr}!`;
            } else {
                return `Victory in ${timeStr}`;
            }
        } else {
            return `Defeated after ${timeStr}`;
        }
    }

    private updateStatsDisplay(battleResult: BattleResult): void {
        if (!this.battleStatsLabel) {
            return;
        }

        const duration = Math.round(battleResult.battleDuration / 1000);
        const fishLost = battleResult.playerFishLost.length;
        const fishKilled = battleResult.opponentFishLost.length;
        const damageDealt = battleResult.totalDamageDealt;

        this.battleStatsLabel.string =
            `Battle Duration: ${duration}s\n` +
            `Fish Lost: ${fishLost}\n` +
            `Enemy Fish Defeated: ${fishKilled}\n` +
            `Total Damage Dealt: ${damageDealt}`;
    }

    private updateRewardsDisplay(battleResult: BattleResult): void {
        if (!this.rewardsLabel) {
            return;
        }

        const tickets = battleResult.lotteryTicketsEarned;
        const achievements = battleResult.achievementsEarned.length;

        this.rewardsLabel.string =
            `🎫 Lottery Tickets: +${tickets}\n` +
            `🏆 Achievements: ${achievements}`;
    }

    private updateAchievementsDisplay(achievements: string[]): void {
        if (!this.achievementsContainer) {
            return;
        }

        // Clear existing achievement displays
        this.achievementsContainer.removeAllChildren();

        if (achievements.length === 0) {
            this.achievementsContainer.active = false;
            return;
        }

        this.achievementsContainer.active = true;

        // Create achievement displays
        achievements.forEach(achievementId => {
            this.createAchievementDisplay(achievementId);
        });
    }

    private createAchievementDisplay(achievementId: string): void {
        // TODO: Create achievement UI node
        // This would typically involve creating a node with icon and text
        console.log(`Achievement earned: ${achievementId}`);

        // For now, just log the achievement
        const achievementInfo = this.getAchievementInfo(achievementId);
        console.log(`Achievement: ${achievementInfo.name} - ${achievementInfo.description}`);
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

    private playVictoryEffects(): void {
        // Show confetti effect
        if (this.confettiEffect) {
            this.confettiEffect.active = true;
            // TODO: Play confetti particle effect

            // Hide confetti after a few seconds
            this.scheduleOnce(() => {
                this.confettiEffect.active = false;
            }, 3);
        }

        // TODO: Play victory sound
        console.log('Playing victory effects');
    }

    private playDefeatEffects(): void {
        // TODO: Play defeat sound and effects
        console.log('Playing defeat effects');
    }

    private onContinueClicked(): void {
        this.hideVictoryScreen();

        // Notify listeners
        this.onContinue.forEach(callback => {
            callback();
        });
    }

    public hideVictoryScreen(): void {
        this.node.active = false;

        if (this.victoryPanel) {
            this.victoryPanel.active = false;
        }

        if (this.defeatPanel) {
            this.defeatPanel.active = false;
        }

        if (this.confettiEffect) {
            this.confettiEffect.active = false;
        }
    }

    // Animation methods
    private animateTitle(): void {
        // TODO: Animate title entrance
        console.log('Animating title');
    }

    private animateStats(): void {
        // TODO: Animate stats counter
        console.log('Animating stats');
    }

    private animateRewards(): void {
        // TODO: Animate reward display
        console.log('Animating rewards');
    }

    public addContinueListener(callback: () => void): void {
        this.onContinue.push(callback);
    }

    public removeContinueListener(callback: () => void): void {
        const index = this.onContinue.indexOf(callback);
        if (index > -1) {
            this.onContinue.splice(index, 1);
        }
    }

    public reset(): void {
        this.hideVictoryScreen();
        this.onContinue = [];

        // Reset achievement container
        if (this.achievementsContainer) {
            this.achievementsContainer.removeAllChildren();
        }
    }
}
