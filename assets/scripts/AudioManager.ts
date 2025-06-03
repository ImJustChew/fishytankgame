import { _decorator, Component, AudioClip, AudioSource, sys } from 'cc';

const { ccclass, property } = _decorator;

export interface AudioSettings {
    bgmVolume: number;
    sfxVolume: number;
    bgmEnabled: boolean;
    sfxEnabled: boolean;
}

@ccclass('AudioManager')
export class AudioManager extends Component {
    private bgmAudioSource: AudioSource | null = null;
    private sfxAudioSource: AudioSource | null = null; @property({
        type: [AudioClip],
        tooltip: 'Background music clips - assign these in the editor'
    })
    private bgmClips: AudioClip[] = [];

    @property({
        type: [AudioClip],
        tooltip: 'Sound effect clips - assign these in the editor'
    })
    private sfxClips: AudioClip[] = [];

    private static instance: AudioManager | null = null;
    private currentBGMIndex: number = 0;
    private audioSettings: AudioSettings = {
        bgmVolume: 0.7,
        sfxVolume: 0.8,
        bgmEnabled: true,
        sfxEnabled: true
    };

    // Storage keys for persistent settings
    private readonly STORAGE_KEY_BGM_VOLUME = 'fishytank_bgm_volume';
    private readonly STORAGE_KEY_SFX_VOLUME = 'fishytank_sfx_volume';
    private readonly STORAGE_KEY_BGM_ENABLED = 'fishytank_bgm_enabled';
    private readonly STORAGE_KEY_SFX_ENABLED = 'fishytank_sfx_enabled';

    static getInstance(): AudioManager | null {
        return AudioManager.instance;
    } onLoad() {
        // Singleton pattern
        if (AudioManager.instance) {
            this.destroy();
            return;
        }
        AudioManager.instance = this;

        // Create audio sources programmatically
        this.createAudioSources();

        // Load saved settings
        this.loadAudioSettings();

        // Apply settings to audio sources
        this.applyAudioSettings();
    } start() {
        // Start playing background music if enabled
        if (this.audioSettings.bgmEnabled && this.bgmClips.length > 0) {
            this.playBGM(0);
        }
    } private createAudioSources() {
        try {
            // Create BGM audio source
            this.bgmAudioSource = this.node.addComponent(AudioSource);
            this.bgmAudioSource.loop = true;
            this.bgmAudioSource.playOnAwake = false;

            // Create SFX audio source
            this.sfxAudioSource = this.node.addComponent(AudioSource);
            this.sfxAudioSource.loop = false;
            this.sfxAudioSource.playOnAwake = false;

            console.log('[AudioManager] Audio sources created programmatically');
        } catch (error) {
            console.error('[AudioManager] Failed to create audio sources:', error);
        }
    }

    private loadAudioSettings() {
        // Load BGM volume
        const savedBGMVolume = sys.localStorage.getItem(this.STORAGE_KEY_BGM_VOLUME);
        if (savedBGMVolume !== null) {
            this.audioSettings.bgmVolume = parseFloat(savedBGMVolume);
        }

        // Load SFX volume
        const savedSFXVolume = sys.localStorage.getItem(this.STORAGE_KEY_SFX_VOLUME);
        if (savedSFXVolume !== null) {
            this.audioSettings.sfxVolume = parseFloat(savedSFXVolume);
        }

        // Load BGM enabled state
        const savedBGMEnabled = sys.localStorage.getItem(this.STORAGE_KEY_BGM_ENABLED);
        if (savedBGMEnabled !== null) {
            this.audioSettings.bgmEnabled = savedBGMEnabled === 'true';
        }

        // Load SFX enabled state
        const savedSFXEnabled = sys.localStorage.getItem(this.STORAGE_KEY_SFX_ENABLED);
        if (savedSFXEnabled !== null) {
            this.audioSettings.sfxEnabled = savedSFXEnabled === 'true';
        }

        console.log('[AudioManager] Loaded audio settings:', this.audioSettings);
    }

    private saveAudioSettings() {
        sys.localStorage.setItem(this.STORAGE_KEY_BGM_VOLUME, this.audioSettings.bgmVolume.toString());
        sys.localStorage.setItem(this.STORAGE_KEY_SFX_VOLUME, this.audioSettings.sfxVolume.toString());
        sys.localStorage.setItem(this.STORAGE_KEY_BGM_ENABLED, this.audioSettings.bgmEnabled.toString());
        sys.localStorage.setItem(this.STORAGE_KEY_SFX_ENABLED, this.audioSettings.sfxEnabled.toString());

        console.log('[AudioManager] Saved audio settings:', this.audioSettings);
    }

    private applyAudioSettings() {
        if (this.bgmAudioSource) {
            this.bgmAudioSource.volume = this.audioSettings.bgmEnabled ? this.audioSettings.bgmVolume : 0;
        }

        if (this.sfxAudioSource) {
            this.sfxAudioSource.volume = this.audioSettings.sfxEnabled ? this.audioSettings.sfxVolume : 0;
        }
    }    // BGM Methods
    playBGM(index: number) {
        if (!this.bgmAudioSource) {
            console.warn('[AudioManager] BGM audio source not available');
            return;
        }

        if (!this.bgmClips[index]) {
            console.warn(`[AudioManager] BGM clip at index ${index} not found`);
            return;
        }

        if (!this.audioSettings.bgmEnabled) {
            console.log('[AudioManager] BGM is disabled');
            return;
        }

        this.currentBGMIndex = index;
        this.bgmAudioSource.clip = this.bgmClips[index];
        this.bgmAudioSource.loop = true;
        this.bgmAudioSource.volume = this.audioSettings.bgmVolume;
        this.bgmAudioSource.play();

        console.log(`[AudioManager] Playing BGM: ${this.bgmClips[index].name}`);
    }

    stopBGM() {
        if (this.bgmAudioSource) {
            this.bgmAudioSource.stop();
        }
    }

    pauseBGM() {
        if (this.bgmAudioSource) {
            this.bgmAudioSource.pause();
        }
    }

    resumeBGM() {
        if (this.bgmAudioSource && this.audioSettings.bgmEnabled) {
            this.bgmAudioSource.play();
        }
    }    // SFX Methods
    playSFX(clipName: string) {
        if (!this.sfxAudioSource) {
            console.warn('[AudioManager] SFX audio source not available');
            return;
        }

        if (!this.audioSettings.sfxEnabled) {
            console.log('[AudioManager] SFX is disabled');
            return;
        }

        const clip = this.sfxClips.find(c => c.name === clipName);
        if (!clip) {
            console.warn(`[AudioManager] SFX clip not found: ${clipName}`);
            return;
        }

        this.sfxAudioSource.playOneShot(clip, this.audioSettings.sfxVolume);
        console.log(`[AudioManager] Playing SFX: ${clipName}`);
    }

    playSFXByIndex(index: number) {
        if (!this.sfxAudioSource) {
            console.warn('[AudioManager] SFX audio source not available');
            return;
        }

        if (!this.sfxClips[index]) {
            console.warn(`[AudioManager] SFX clip at index ${index} not found`);
            return;
        }

        if (!this.audioSettings.sfxEnabled) {
            console.log('[AudioManager] SFX is disabled');
            return;
        }

        this.sfxAudioSource.playOneShot(this.sfxClips[index], this.audioSettings.sfxVolume);
        console.log(`[AudioManager] Playing SFX: ${this.sfxClips[index].name}`);
    }

    // Volume Control Methods
    setBGMVolume(volume: number) {
        this.audioSettings.bgmVolume = Math.max(0, Math.min(1, volume));
        this.saveAudioSettings();
        this.applyAudioSettings();

        console.log(`[AudioManager] BGM volume set to: ${this.audioSettings.bgmVolume}`);
    }

    setSFXVolume(volume: number) {
        this.audioSettings.sfxVolume = Math.max(0, Math.min(1, volume));
        this.saveAudioSettings();
        this.applyAudioSettings();

        console.log(`[AudioManager] SFX volume set to: ${this.audioSettings.sfxVolume}`);
    }

    setBGMEnabled(enabled: boolean) {
        this.audioSettings.bgmEnabled = enabled;
        this.saveAudioSettings();

        if (enabled) {
            this.applyAudioSettings();
            // Resume current BGM if it was playing
            if (this.bgmAudioSource && this.bgmAudioSource.clip && !this.bgmAudioSource.playing) {
                this.resumeBGM();
            }
        } else {
            this.pauseBGM();
        }

        console.log(`[AudioManager] BGM enabled: ${enabled}`);
    }

    setSFXEnabled(enabled: boolean) {
        this.audioSettings.sfxEnabled = enabled;
        this.saveAudioSettings();
        this.applyAudioSettings();

        console.log(`[AudioManager] SFX enabled: ${enabled}`);
    }

    // Getters
    getAudioSettings(): AudioSettings {
        return { ...this.audioSettings };
    }

    getBGMVolume(): number {
        return this.audioSettings.bgmVolume;
    }

    getSFXVolume(): number {
        return this.audioSettings.sfxVolume;
    }

    isBGMEnabled(): boolean {
        return this.audioSettings.bgmEnabled;
    }

    isSFXEnabled(): boolean {
        return this.audioSettings.sfxEnabled;
    }

    onDestroy() {
        if (AudioManager.instance === this) {
            AudioManager.instance = null;
        }
    }
}
