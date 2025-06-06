import { _decorator, Component, Button, Color, director, AudioClip, AudioSource, Node } from 'cc';
import authService from './firebase/auth-service';
import databaseService, { UserData } from './firebase/database-service';
import firebase from './firebase/firebase-compat.js';

const { ccclass, property } = _decorator;

@ccclass('StartButtonController')
export class StartButtonController extends Component {
    @property({
        type: Button,
        tooltip: 'The start game button'
    })
    private startButton: Button | null = null;

    @property({
        tooltip: 'Color when button is disabled (not logged in)'
    })
    private disabledColor: Color = new Color(128, 128, 128, 255);

    @property({
        tooltip: 'Color when button is enabled (logged in)'
    })
    private enabledColor: Color = new Color(255, 255, 255, 255);

    @property(AudioClip)
    clickButtonSound: AudioClip = null;

    private authStateUnsubscribe: firebase.Unsubscribe | null = null;
    private originalButtonColor: Color = new Color();

    start() {
        this.setupButton();
        this.setupAuthStateListener();
    }

    private setupButton() {
        if (!this.startButton) {
            console.error('[StartButtonController] Start button not assigned!');
            return;
        }

        // Store original button color
        if (this.startButton.normalColor) {
            this.originalButtonColor = this.startButton.normalColor.clone();
        }

        // Set up click event
        this.startButton.node.on(Button.EventType.CLICK, this.onStartButtonClick, this);

        // Initially disable the button
        this.setButtonState(false);
    }

    private setupAuthStateListener() {
        this.authStateUnsubscribe = authService.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in, check if they have a complete profile
                await this.checkUserProfileAndUpdateButton(user);
            } else {
                // User is signed out
                this.setButtonState(false);
            }
        });
    }

    private async checkUserProfileAndUpdateButton(user: firebase.User) {
        try {
            const userData = await databaseService.getUserData();

            // Enable button only if user has complete profile with username
            const hasCompleteProfile = userData && userData.username && userData.username.trim() !== '';
            this.setButtonState(hasCompleteProfile);

        } catch (error) {
            console.error('[StartButtonController] Error checking user profile:', error);
            this.setButtonState(false);
        }
    }

    private setButtonState(isEnabled: boolean) {
        if (!this.startButton) return;

        // Set button interactability
        this.startButton.interactable = isEnabled;

        // Update button visual state
        if (isEnabled) {
            this.startButton.normalColor = this.enabledColor;
            console.log('[StartButtonController] Start button enabled - user is logged in with complete profile');
        } else {
            this.startButton.normalColor = this.disabledColor;
            console.log('[StartButtonController] Start button disabled - user not logged in or incomplete profile');
        }

        // Force button to update its visual state
        this.startButton.node.emit('color-changed');
    }

    private onStartButtonClick() {
        if (!this.startButton?.interactable) {
            console.log('[StartButtonController] Start button clicked but not interactable');
            return;
        }
        if (this.clickButtonSound) {
            const sfxNode = new Node('SFXAudioSource');
            const sfx = sfxNode.addComponent(AudioSource);
            sfx.clip = this.clickButtonSound;
            sfx.volume = 0.6;
            sfx.play();
            this.node.addChild(sfxNode);
            sfx.node.once(AudioSource.EventType.ENDED, () => {
                sfxNode.destroy();
            });
        }
        console.log('[StartButtonController] Start button clicked - starting game!');
        this.startGame();
    }

    private startGame() {

        console.log('[StartButtonController] Starting game...');
        setTimeout(() => {
                director.loadScene('aquarium');
        }, 150);
    }

    /**
     * Force check the current authentication state
     * Useful for manual refresh
     */
    public refreshButtonState() {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            this.checkUserProfileAndUpdateButton(currentUser);
        } else {
            this.setButtonState(false);
        }
    }

    /**
     * Manually enable/disable the button (for testing or special cases)
     */
    public setButtonEnabled(enabled: boolean) {
        this.setButtonState(enabled);
    } 
    
    onDestroy() {
        // Clean up event listeners
        if (this.startButton && this.startButton.node) {
            this.startButton.node.off(Button.EventType.CLICK, this.onStartButtonClick, this);
        }

        // Unsubscribe from auth state changes
        if (this.authStateUnsubscribe) {
            this.authStateUnsubscribe();
        }
    }
}
