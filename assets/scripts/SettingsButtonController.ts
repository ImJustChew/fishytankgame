import { _decorator, Component, Button } from 'cc';
import { SettingsDialog } from './SettingsDialog';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

@ccclass('SettingsButtonController')
export class SettingsButtonController extends Component {
    @property({
        type: Button,
        tooltip: 'The settings button'
    })
    private settingsButton: Button | null = null;

    @property({
        type: SettingsDialog,
        tooltip: 'Reference to the settings dialog component'
    })
    private settingsDialog: SettingsDialog | null = null;

    start() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        if (this.settingsButton) {
            this.settingsButton.node.on(Button.EventType.CLICK, this.onSettingsButtonClick, this);
        } else {
            console.error('[SettingsButtonController] Settings button not assigned!');
        }
    }

    private onSettingsButtonClick() {
        // Play button click sound
        const audioManager = AudioManager.getInstance();
        if (audioManager) {
            audioManager.playSFX('button_click');
        }

        // Open settings dialog
        if (this.settingsDialog) {
            this.settingsDialog.show();
        } else {
            console.error('[SettingsButtonController] Settings dialog not assigned!');
        }

        console.log('[SettingsButtonController] Settings button clicked');
    }

    /**
     * Programmatically open the settings dialog
     */
    public openSettings() {
        this.onSettingsButtonClick();
    } onDestroy() {
        if (this.settingsButton && this.settingsButton.node) {
            this.settingsButton.node.off(Button.EventType.CLICK, this.onSettingsButtonClick, this);
        }
    }
}
