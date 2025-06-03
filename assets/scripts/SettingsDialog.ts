import { _decorator, Component, Node, Button, Label, Slider, Toggle } from 'cc';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

@ccclass('SettingsDialog')
export class SettingsDialog extends Component {
    @property({
        type: Node,
        tooltip: 'Root node of the settings dialog'
    })
    private dialogRoot: Node | null = null;

    @property({
        type: Button,
        tooltip: 'Button to close the settings dialog'
    })
    private closeButton: Button | null = null;

    @property({
        type: Slider,
        tooltip: 'Slider for BGM volume control'
    })
    private bgmVolumeSlider: Slider | null = null;

    @property({
        type: Label,
        tooltip: 'Label to display BGM volume percentage'
    })
    private bgmVolumeLabel: Label | null = null;

    @property({
        type: Toggle,
        tooltip: 'Toggle for enabling/disabling BGM'
    })
    private bgmToggle: Toggle | null = null;

    @property({
        type: Slider,
        tooltip: 'Slider for SFX volume control'
    })
    private sfxVolumeSlider: Slider | null = null;

    @property({
        type: Label,
        tooltip: 'Label to display SFX volume percentage'
    })
    private sfxVolumeLabel: Label | null = null;

    @property({
        type: Toggle,
        tooltip: 'Toggle for enabling/disabling SFX'
    })
    private sfxToggle: Toggle | null = null;

    @property({
        type: Button,
        tooltip: 'Button to reset settings to default'
    })
    private resetButton: Button | null = null;

    private audioManager: AudioManager | null = null;

    start() {
        this.setupEventListeners();
        this.hide();

        // Get audio manager instance
        this.audioManager = AudioManager.getInstance();
        if (!this.audioManager) {
            console.warn('[SettingsDialog] AudioManager instance not found');
        }
    }

    private setupEventListeners() {
        // Close button
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.hide, this);
        }

        // Reset button
        if (this.resetButton) {
            this.resetButton.node.on(Button.EventType.CLICK, this.resetToDefaults, this);
        }

        // BGM volume slider
        if (this.bgmVolumeSlider) {
            this.bgmVolumeSlider.node.on('slide', this.onBGMVolumeChanged, this);
        }

        // SFX volume slider
        if (this.sfxVolumeSlider) {
            this.sfxVolumeSlider.node.on('slide', this.onSFXVolumeChanged, this);
        }

        // BGM toggle
        if (this.bgmToggle) {
            this.bgmToggle.node.on(Toggle.EventType.TOGGLE, this.onBGMToggleChanged, this);
        }

        // SFX toggle
        if (this.sfxToggle) {
            this.sfxToggle.node.on(Toggle.EventType.TOGGLE, this.onSFXToggleChanged, this);
        }
    }

    show() {
        if (this.dialogRoot) {
            this.dialogRoot.active = true;
        }

        // Load current settings from audio manager
        this.loadCurrentSettings();

        console.log('[SettingsDialog] Settings dialog opened');
    }

    hide() {
        if (this.dialogRoot) {
            this.dialogRoot.active = false;
        }

        console.log('[SettingsDialog] Settings dialog closed');
    }

    private loadCurrentSettings() {
        if (!this.audioManager) {
            this.audioManager = AudioManager.getInstance();
            if (!this.audioManager) {
                console.warn('[SettingsDialog] AudioManager still not available');
                return;
            }
        }

        const settings = this.audioManager.getAudioSettings();

        // Update BGM controls
        if (this.bgmVolumeSlider) {
            this.bgmVolumeSlider.progress = settings.bgmVolume;
        }
        if (this.bgmVolumeLabel) {
            this.bgmVolumeLabel.string = `${Math.round(settings.bgmVolume * 100)}%`;
        }
        if (this.bgmToggle) {
            this.bgmToggle.isChecked = settings.bgmEnabled;
        }

        // Update SFX controls
        if (this.sfxVolumeSlider) {
            this.sfxVolumeSlider.progress = settings.sfxVolume;
        }
        if (this.sfxVolumeLabel) {
            this.sfxVolumeLabel.string = `${Math.round(settings.sfxVolume * 100)}%`;
        }
        if (this.sfxToggle) {
            this.sfxToggle.isChecked = settings.sfxEnabled;
        }

        // Update slider interactability based on toggle states
        this.updateSliderStates();
    } private updateSliderStates() {
        if (this.bgmVolumeSlider && this.bgmToggle) {
            // Enable/disable slider node based on toggle state
            this.bgmVolumeSlider.node.getComponent(Slider)!.enabled = this.bgmToggle.isChecked;
        }

        if (this.sfxVolumeSlider && this.sfxToggle) {
            // Enable/disable slider node based on toggle state
            this.sfxVolumeSlider.node.getComponent(Slider)!.enabled = this.sfxToggle.isChecked;
        }
    }

    private onBGMVolumeChanged(slider: Slider) {
        if (!this.audioManager) return;

        const volume = slider.progress;
        this.audioManager.setBGMVolume(volume);

        // Update volume label
        if (this.bgmVolumeLabel) {
            this.bgmVolumeLabel.string = `${Math.round(volume * 100)}%`;
        }

        console.log(`[SettingsDialog] BGM volume changed to: ${Math.round(volume * 100)}%`);
    }

    private onSFXVolumeChanged(slider: Slider) {
        if (!this.audioManager) return;

        const volume = slider.progress;
        this.audioManager.setSFXVolume(volume);

        // Update volume label
        if (this.sfxVolumeLabel) {
            this.sfxVolumeLabel.string = `${Math.round(volume * 100)}%`;
        }

        // Play a test sound effect
        this.audioManager.playSFX('button_click'); // Assumes you have a button click SFX

        console.log(`[SettingsDialog] SFX volume changed to: ${Math.round(volume * 100)}%`);
    }

    private onBGMToggleChanged(toggle: Toggle) {
        if (!this.audioManager) return;

        this.audioManager.setBGMEnabled(toggle.isChecked);
        this.updateSliderStates();

        console.log(`[SettingsDialog] BGM toggled: ${toggle.isChecked ? 'ON' : 'OFF'}`);
    }

    private onSFXToggleChanged(toggle: Toggle) {
        if (!this.audioManager) return;

        this.audioManager.setSFXEnabled(toggle.isChecked);
        this.updateSliderStates();

        // Play a test sound effect if enabling
        if (toggle.isChecked) {
            this.audioManager.playSFX('button_click');
        }

        console.log(`[SettingsDialog] SFX toggled: ${toggle.isChecked ? 'ON' : 'OFF'}`);
    }

    private resetToDefaults() {
        if (!this.audioManager) return;

        // Reset to default values
        this.audioManager.setBGMVolume(0.7);
        this.audioManager.setSFXVolume(0.8);
        this.audioManager.setBGMEnabled(true);
        this.audioManager.setSFXEnabled(true);

        // Reload current settings to update UI
        this.loadCurrentSettings();

        // Play confirmation sound
        this.audioManager.playSFX('button_click');

        console.log('[SettingsDialog] Settings reset to defaults');
    }

    /**
     * Toggle the settings dialog visibility
     */
    public toggle() {
        if (this.dialogRoot) {
            if (this.dialogRoot.active) {
                this.hide();
            } else {
                this.show();
            }
        }
    }

    /**
     * Check if the dialog is currently visible
     */
    public isVisible(): boolean {
        return this.dialogRoot ? this.dialogRoot.active : false;
    } onDestroy() {
        // Clean up event listeners
        if (this.closeButton && this.closeButton.node) {
            this.closeButton.node.off(Button.EventType.CLICK, this.hide, this);
        }

        if (this.resetButton && this.resetButton.node) {
            this.resetButton.node.off(Button.EventType.CLICK, this.resetToDefaults, this);
        }

        if (this.bgmVolumeSlider && this.bgmVolumeSlider.node) {
            this.bgmVolumeSlider.node.off('slide', this.onBGMVolumeChanged, this);
        }

        if (this.sfxVolumeSlider && this.sfxVolumeSlider.node) {
            this.sfxVolumeSlider.node.off('slide', this.onSFXVolumeChanged, this);
        }

        if (this.bgmToggle && this.bgmToggle.node) {
            this.bgmToggle.node.off(Toggle.EventType.TOGGLE, this.onBGMToggleChanged, this);
        }

        if (this.sfxToggle && this.sfxToggle.node) {
            this.sfxToggle.node.off(Toggle.EventType.TOGGLE, this.onSFXToggleChanged, this);
        }
    }
}
