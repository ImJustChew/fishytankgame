import { _decorator, Component, Node, Button, director, AudioClip, AudioSource } from 'cc';
import { FriendListPanel } from './FriendListPanel';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

@ccclass('MainUIController')
export class MainUIController extends Component {

    @property(Button)
    friendListButton: Button = null;

    @property(Button)
    exitButton: Button = null;

    @property(Button)
    shopButton: Button = null;

    @property(FriendListPanel)
    friendListPanel: FriendListPanel = null;

    @property(AudioClip)
    clickButtonSound: AudioClip = null;

    @property(Node)
    TankBGMNode: Node = null;

    @property(Button)
    miniGameButton: Button = null;

    private musicAudioSource: AudioSource | null = null;

    onLoad() {
        if (this.friendListButton) {
            console.log('[MainUIController] Friend List Button found, setting up click listener.');
            this.friendListButton.node.on(Button.EventType.CLICK, this.onFriendListClicked, this);
        }
        if (this.exitButton) {
            console.log('[MainUIController] Exit Button found, setting up click listener.');
            this.exitButton.node.on(Button.EventType.CLICK, this.onExitClicked, this);
        }
        if (this.shopButton) {
            console.log('[MainUIController] Shop Button found, setting up click listener.');
            this.shopButton.node.on(Button.EventType.CLICK, this.onShopClicked, this);
        }
        if (this.miniGameButton) {
            console.log('[MainUIController] Mini Game Button found, setting up click listener.');
            this.miniGameButton.node.on(Button.EventType.CLICK, this.onMiniGameClicked, this);
        }

        if (this.friendListPanel) {
            this.friendListPanel.hide();
        }
    }

    start() {
        if (!this.musicAudioSource) {
            this.musicAudioSource = this.node.getComponent(AudioSource);
        }
        this.TankBGMNode = director.getScene().getChildByName('TankBGMController');
    }


    private onFriendListClicked() {
        console.log('[MainUIController] Friend List Button clicked.');
        if (!this.friendListPanel.node.active) {
            if (this.musicAudioSource && this.clickButtonSound) {
                this.musicAudioSource.playOneShot(this.clickButtonSound, AudioManager.getSFXVolume());
            }
            if (this.friendListPanel) {
                this.friendListPanel.show();
            }
        }
    }


    private onExitClicked() {
        if (!this.friendListPanel.node.active) {
            if (this.musicAudioSource && this.clickButtonSound) {
                this.musicAudioSource.playOneShot(this.clickButtonSound, AudioManager.getSFXVolume());
            }
            director.removePersistRootNode(this.TankBGMNode);
            console.log('[MainUIController] Exit Button clicked.');
            setTimeout(() => {
                director.loadScene('mainmenu');
            }, 200);
        }
    }

    private onShopClicked() {
        if (!this.friendListPanel.node.active) {
            if (this.musicAudioSource && this.clickButtonSound) {
                this.musicAudioSource.playOneShot(this.clickButtonSound, AudioManager.getSFXVolume());
            }
            console.log('[MainUIController] Shop Button clicked.');
            setTimeout(() => {
                director.loadScene('shopmenu');
            }, 150);
        }
    }

    private onMiniGameClicked() {
        if (!this.friendListPanel.node.active) {
            if (this.musicAudioSource && this.clickButtonSound) {
                this.musicAudioSource.playOneShot(this.clickButtonSound, AudioManager.getSFXVolume());
            }
            console.log('[MainUIController] Shop Button clicked.');
            setTimeout(() => {
                director.loadScene('minigame_bombfish');
            }, 150);
        }
    }

    onDestroy() {
        if (this.friendListButton) {
            this.friendListButton.node.off(Button.EventType.CLICK, this.onFriendListClicked, this);
        }
    }
}