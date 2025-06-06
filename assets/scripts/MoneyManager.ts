import { _decorator, Component, Label, tween, Color, Vec3 } from 'cc';
import databaseService, { SavedFishType, UserData } from './firebase/database-service';
import authService from './firebase/auth-service';
import { FISH_LIST } from './FishData';

const { ccclass, property } = _decorator;

/**
 * MoneyManager
 * 
 * Handles passive income calculation from fishes and updates user's money in real-time.
 * Also provides UI elements to display the current money and income rate.
 */
@ccclass('MoneyManager')
export class MoneyManager extends Component {
    // UI Elements
    @property(Label)
    private moneyLabel: Label | null = null;

    @property(Label)
    private incomeRateLabel: Label | null = null;

    // Animation settings for money label
    @property
    private animationDuration: number = 0.3;

    @property
    private updateInterval: number = 10.0; // Time in seconds between money updates    // State variables
    private userFishes: SavedFishType[] = [];
    private userData: UserData | null = null;
    private totalIncomeRate: number = 0;
    private updateTimer: number = 0;
    private unsubscribeFishListener: (() => void) | null = null;
    private unsubscribeUserDataListener: (() => void) | null = null;
    private unsubscribeAuthListener: (() => void) | null = null;    private isUserLoggedIn: boolean = false;
    private originalMoneyColor: Color = new Color(255, 255, 255, 255);
    private highlightMoneyColor: Color = new Color(255, 255, 0, 255); // Yellow highlight
    private originalMoneyScale: Vec3 | null = null;

    start() {
        this.setupAuthListener();
    }

    onDestroy() {
        // Clean up Firebase listeners
        this.cleanupListeners();
    }
      private cleanupListeners(): void {
        if (this.unsubscribeFishListener) {
            this.unsubscribeFishListener();
            this.unsubscribeFishListener = null;
        }
        
        if (this.unsubscribeUserDataListener) {
            this.unsubscribeUserDataListener();
            this.unsubscribeUserDataListener = null;
        }
        
        if (this.unsubscribeAuthListener) {
            this.unsubscribeAuthListener();
            this.unsubscribeAuthListener = null;
        }
    }    /**
     * Sets up the authentication listener to monitor login status
     */
    private setupAuthListener(): void {
        // Save original money label color and scale for animations if available
        if (this.moneyLabel) {
            if (this.moneyLabel.color) {
                this.originalMoneyColor = this.moneyLabel.color.clone();
            }
            if (this.moneyLabel.node) {
                this.originalMoneyScale = this.moneyLabel.node.scale.clone();
            }
        }
        
        // Display initial UI state
        this.updateMoneyDisplay();
        this.updateIncomeRateDisplay();

        // Subscribe to authentication state changes
        this.unsubscribeAuthListener = authService.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("User logged in, initializing money manager");
                this.isUserLoggedIn = true;
                await this.initializeManager();
            } else {
                console.log("User logged out, cleaning up money manager");
                this.isUserLoggedIn = false;
                this.userData = null;
                this.userFishes = [];
                this.totalIncomeRate = 0;
                  // Clean up fish listener if active
                if (this.unsubscribeFishListener) {
                    this.unsubscribeFishListener();
                    this.unsubscribeFishListener = null;
                }
                
                // Clean up user data listener if active
                if (this.unsubscribeUserDataListener) {
                    this.unsubscribeUserDataListener();
                    this.unsubscribeUserDataListener = null;
                }
                
                // Update UI to show no income
                this.updateMoneyDisplay();
                this.updateIncomeRateDisplay();
            }
        });
    }

    /**
     * Initializes the money manager after user login
     */
    async initializeManager() {
        if (!this.isUserLoggedIn) {
            console.log('Cannot initialize money manager: User not logged in');
            return;
        }
        
        // Get initial user data
        this.userData = await databaseService.getUserData();

        if (!this.userData) {
            console.error('Failed to load user data for MoneyManager');
            return;
        }        // Subscribe to fish collection changes
        this.unsubscribeFishListener = databaseService.onFishDataChanged((fishes) => {
            if (fishes) {
                this.userFishes = fishes;
                this.recalculateTotalIncomeRate();
                this.updateIncomeRateDisplay();
            }
        });

        // Subscribe to user data changes (including money field)
        this.unsubscribeUserDataListener = databaseService.onUserDataChanged((userData) => {
            if (userData) {
                // Sync the money field with database changes
                this.userData = userData;
                this.updateMoneyDisplay();
                console.log('MoneyManager: User data synced from database');
            }
        });

        // Initial calculation and display
        await this.calculateOfflineIncome();
        this.updateMoneyDisplay();
    }

    update(deltaTime: number) {
        // Accumulate time until next update
        this.updateTimer += deltaTime;

        // Update money if enough time has passed
        if (this.updateTimer >= this.updateInterval) {
            this.updateMoney();
            this.updateTimer = 0;
        }
    }

    /**
     * Calculates income earned while the user was offline
     * This is called once when the game starts
     */
    async calculateOfflineIncome() {
        if (!this.userData) return;

        const now = Date.now();
        const lastCalculatedTime = this.userData.lastCalculatedMoney || now;
        const timeOfflineSecs = Math.max(0, (now - lastCalculatedTime) / 1000);

        // If user was offline for a meaningful amount of time
        if (timeOfflineSecs > 5) {
            // First, get the current fish collection to calculate income rate
            const fishes = await databaseService.getSavedFish();
            if (fishes) {
                this.userFishes = fishes;
                this.recalculateTotalIncomeRate();

                // Calculate offline earnings
                const earnedMoney = Math.floor(this.totalIncomeRate * timeOfflineSecs);

                if (earnedMoney > 0) {
                    // Update user's money
                    const newMoney = this.userData.money + earnedMoney;
                    await databaseService.updateUserField('money', newMoney);
                    this.userData.money = newMoney;

                    // Show notification about offline earnings
                    console.log(`You earned ${earnedMoney} coins while away!`);

                    // Show offline earnings with animation
                    const minutes = Math.floor(timeOfflineSecs / 60);
                    const timeText = minutes > 0 ? `${minutes} min` : `${Math.floor(timeOfflineSecs)} sec`;
                    this.animateOfflineEarnings(earnedMoney, timeText);
                }
            }
        }

        // Update lastCalculatedMoney to current time
        await databaseService.updateUserField('lastCalculatedMoney', now);
    }

    /**
     * Update user's money based on current income rate
     * Called periodically by the update method
     */
    async updateMoney() {
        if (!this.userData || this.totalIncomeRate <= 0) return;

        // Calculate earned money for this update cycle
        const earnedMoney = this.totalIncomeRate;

        if (earnedMoney > 0) {
            // Update local user data
            if (this.userData) {
                this.userData.money += earnedMoney;

                // Update money display with animation
                this.animateMoneyIncrease();
            }

            // Update database
            const now = Date.now();
            await Promise.all([
                databaseService.updateUserField('money', this.userData?.money),
                databaseService.updateUserField('lastCalculatedMoney', now)
            ]);
        }
    }

    /**
     * Recalculates the total income rate based on owned fish
     */
    recalculateTotalIncomeRate() {
        this.totalIncomeRate = 0;

        // Count each type of fish and multiply by their income rate
        const fishCounts: { [fishType: string]: number } = {};

        this.userFishes.forEach(fish => {
            fishCounts[fish.type] = (fishCounts[fish.type] || 0) + 1;
        });

        // Calculate total income based on fish counts and their income rates
        Object.keys(fishCounts).forEach(fishType => {
            const fishData = FISH_LIST.find(f => f.id === fishType);
            if (fishData && fishData.moneyPerSecond) {
                this.totalIncomeRate += fishCounts[fishType] * fishData.moneyPerSecond;
            }
        });
    }

    /**
     * Updates the money label in the UI
     */
    updateMoneyDisplay() {
        if (this.moneyLabel && this.userData) {
            this.moneyLabel.string = `${Math.floor(this.userData.money)}`;
        }
    }

    /**
     * Updates the income rate label in the UI
     */
    updateIncomeRateDisplay() {
        if (this.incomeRateLabel) {
            this.incomeRateLabel.string = `+${this.totalIncomeRate.toFixed(1)}/10sec`;
        }
    }    /**
     * Animates the money label when money increases
     */
    animateMoneyIncrease() {
        if (!this.moneyLabel || !this.userData) return;

        // Update the money value
        this.updateMoneyDisplay();

        // Animate the money label with color change
        tween(this.moneyLabel)
            .to(this.animationDuration / 2, { color: this.highlightMoneyColor })
            .to(this.animationDuration / 2, { color: this.originalMoneyColor })
            .start();

        // Animate the node with scale change
        if (this.moneyLabel.node && this.originalMoneyScale) {
            const scaleUpTarget = this.originalMoneyScale.clone().multiplyScalar(1.2);
            tween(this.moneyLabel.node)
                .to(this.animationDuration / 2, { scale: scaleUpTarget })
                .to(this.animationDuration / 2, { scale: this.originalMoneyScale.clone() })
                .start();
        }
    }/**
     * Displays and animates offline earnings notification
     */
    animateOfflineEarnings(amount: number, timeText: string) {
        if (!this.moneyLabel) return;

        console.log(`Offline earnings: +${amount} coins earned in ${timeText}`);

        // Create a message to display (implement based on your UI)
        // For now, we'll just do a more dramatic animation on the money label

        // Animate the money label color
        tween(this.moneyLabel)
            .to(0.3, { color: this.highlightMoneyColor })
            .delay(0.6)
            .to(0.3, { color: this.originalMoneyColor })
            .start();        // Animate the node scale if it exists
        if (this.moneyLabel.node && this.originalMoneyScale) {
            const scaleUpLarge = this.originalMoneyScale.clone().multiplyScalar(1.5);
            const scaleUpSmall = this.originalMoneyScale.clone().multiplyScalar(1.2);
            tween(this.moneyLabel.node)
                .to(0.3, { scale: scaleUpLarge })
                .to(0.3, { scale: this.originalMoneyScale.clone() })
                .to(0.3, { scale: scaleUpSmall })
                .to(0.3, { scale: this.originalMoneyScale.clone() })
                .start();
        }

        // You should implement a proper notification UI for offline earnings
        // This could be a modal dialog, toast notification, etc.
    }
}
