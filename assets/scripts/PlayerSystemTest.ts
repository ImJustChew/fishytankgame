import { _decorator, Component, Node, input, Input, KeyCode } from 'cc';
import { FishTankManager } from './FishTankManager';
import { Player } from './Player';

const { ccclass, property } = _decorator;

/**
 * PlayerSystemTest
 * 
 * This is a test component to demonstrate and test the player system functionality.
 * Add this component to a test node and assign the FishTankManager to test player controls.
 */
@ccclass('PlayerSystemTest')
export class PlayerSystemTest extends Component {
    @property(FishTankManager)
    fishTankManager: FishTankManager | null = null;

    private currentPlayer: Player | null = null;

    start() {
        this.setupTestControls();
        this.getCurrentPlayer();
    }

    /**
     * Get reference to the current user's player
     */
    private getCurrentPlayer() {
        if (this.fishTankManager) {
            this.currentPlayer = this.fishTankManager.getCurrentUserPlayer();
            if (this.currentPlayer) {
                console.log('Player system test: Found current user player');
            } else {
                console.log('Player system test: No current user player found');
            }
        }
    }

    /**
     * Set up additional test controls (beyond WASD movement)
     */
    private setupTestControls() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    /**
     * Handle test key presses
     */
    private onKeyDown(event: any) {
        if (!this.fishTankManager) return;

        switch (event.keyCode) {
            case KeyCode.KEY_R:
                // Refresh players
                console.log('Refreshing players...');
                this.fishTankManager.refreshPlayers();
                break;
            case KeyCode.KEY_P:
                // Print player count
                const playerCount = this.fishTankManager.getPlayerCount();
                console.log(`Current player count: ${playerCount}`);
                break;
            case KeyCode.KEY_U:
                // Get current user player info
                this.getCurrentPlayer();
                if (this.currentPlayer) {
                    const playerData = this.currentPlayer.getPlayerData();
                    console.log('Current player position:', playerData);
                } else {
                    console.log('No current user player found');
                }
                break;
            case KeyCode.KEY_I:
                // Print system info
                this.printSystemInfo();
                break;
        }
    }

    /**
     * Print comprehensive system information
     */
    private printSystemInfo() {
        if (!this.fishTankManager) {
            console.log('FishTankManager not assigned');
            return;
        }

        console.log('=== Player System Test Info ===');
        console.log(`Total players: ${this.fishTankManager.getPlayerCount()}`);
        console.log(`Total fish: ${this.fishTankManager.getFishCount()}`);

        const currentPlayer = this.fishTankManager.getCurrentUserPlayer();
        if (currentPlayer) {
            const playerData = currentPlayer.getPlayerData();
            console.log(`Current user player: ${playerData?.ownerId} at (${playerData?.x}, ${playerData?.y})`);
        } else {
            console.log('No current user player active');
        }

        console.log('=== Test Controls ===');
        console.log('WASD: Move player');
        console.log('R: Refresh players');
        console.log('P: Print player count');
        console.log('U: Get current user player info');
        console.log('I: Print this info');
        console.log('================================');
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }
}
