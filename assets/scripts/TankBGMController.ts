import { _decorator, Component, Node, Button, director, AudioClip, AudioSource, tween } from 'cc';
const { ccclass, property } = _decorator;
import { TankBGMManager } from './TankBGMManager';

@ccclass('TankBGMController')
export class TankBGMController extends Component {

    @property(AudioClip)
    backgroundMusic: AudioClip | null = null;

    private musicAudioSource: AudioSource | null = null;

    start() {
        director.addPersistRootNode(this.node);
        TankBGMManager.bgmNode = this.node;
        this.playBackgroundMusicWithFadeIn();
    }

    private playBackgroundMusicWithFadeIn() {
        console.log('Playing background music with fade-in effect');
        if (!this.backgroundMusic) return;
        if (!this.musicAudioSource) {
            this.musicAudioSource = this.node.getComponent(AudioSource);
        }
        console.log('Music AudioSource:', this.musicAudioSource);

        this.musicAudioSource.clip = this.backgroundMusic;
        this.musicAudioSource.loop = true;
        this.musicAudioSource.volume = 0; 
        this.musicAudioSource.play();

        tween(this.musicAudioSource)
            .to(3, { volume: 0.2 })
            .start();
    }

    update(deltaTime: number) {
        
    }
}


