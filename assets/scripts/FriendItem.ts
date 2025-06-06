import { _decorator, Component, Node, Label, Button, Color, Sprite, AudioClip, AudioSource, director } from 'cc';
import { FriendData, StealAttempt } from './firebase/social-service';
import { TankBGMManager } from './TankBGMManager';

const { ccclass, property } = _decorator;

@ccclass('FriendItem')
export class FriendItem extends Component {

    @property(Label)
    usernameLabel: Label = null;

    @property(Label)
    lastLoginLabel: Label = null;

    @property(Label)
    statusLabel: Label = null;

    @property(Label)
    moneyLabel: Label = null;

    @property(Button)
    visitButton: Button = null;

    @property(Button)
    removeButton: Button = null;

    @property(AudioClip)
    clickButtonSound: AudioClip = null;

    private friendData: FriendData = null;
    private onRemoveCallback: (friendUid: string) => void = null;
    private onAcceptCallback: (friendUid: string) => void = null;
    private isFriendPending: boolean = false;

    private musicAudioSource: AudioSource | null = null;

    onLoad() {
        if (this.visitButton) {
            this.visitButton.node.on(Button.EventType.CLICK, this.onVisitClicked, this);
        }
        if (this.removeButton) {
            this.removeButton.node.on(Button.EventType.CLICK, this.onRemoveClicked, this);
        }
    }


    start() {
        if (!this.musicAudioSource) {
            this.musicAudioSource = this.node.getComponent(AudioSource);
        }
    }

    /**
     * initializes the friend item with data
     */
    setupFriendItem(
        friendData: FriendData,
        hasStolen: boolean,
        onRemoveCallback?: (friendUid: string) => void,
        onAcceptCallback?: (friendUid: string) => void,
        isPending: boolean = false
    ) {
        this.friendData = friendData;
        this.isFriendPending = isPending;
        this.onRemoveCallback = onRemoveCallback || null;
        this.onAcceptCallback = onAcceptCallback || null;

        if (this.usernameLabel) {
            this.usernameLabel.string = friendData.username;
        }
        if (this.lastLoginLabel) {
            this.lastLoginLabel.string = this.formatLastLogin(friendData.lastOnline);
        }
        if (this.statusLabel) {
            this.setupFriendStatus(hasStolen);
        }
        if (this.moneyLabel) {
            this.moneyLabel.string = `$${('000000' + friendData.money).slice(-6)}`;
        }
        if (this.isFriendPending && this.visitButton) {
            const labelNode = this.visitButton.node.children[0];
            if (labelNode) {
                const label = labelNode.getComponent(Label);
                if (label) {
                    label.string = 'ACCEPT';
                    label.fontSize = 23;
                }
            }
            const sprite = this.visitButton.node.getComponent(Sprite);
            sprite.color = new Color(100, 255, 100, 255); // green
        }
    }

    /**
     * format the last login time 
     */
    private formatLastLogin(lastOnlineTime: number | null): string {
        if (!lastOnlineTime) {
            return 'last login: unknown';
        }
        const now = Date.now();
        const timeDiff = now - lastOnlineTime;
        const minutes = Math.floor(timeDiff / (1000 * 60));

        if (minutes < 1) {
            return 'last login: just now';
        } else if (minutes < 60) {
            return `last login: ${minutes} min ago`;
        } else if (minutes < 1440) { // 24hr
            const hours = Math.floor(minutes / 60);
            return `last login: ${hours} hr ago`;
        } else if (minutes < 10080) { // 7days
            const days = Math.floor(minutes / 1440);
            return `last login: ${days} day${days > 1 ? 's' : ''} ago`;
        } else if (minutes < 43200) { // 30days
            const weeks = Math.floor(minutes / 10080);
            return `last login: ${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            const months = Math.floor(minutes / 43200);
            return `last login: ${months} month${months > 1 ? 's' : ''} ago`;
        }
    }


    private setupFriendStatus(hasStolen: boolean) {
        if (this.isFriendPending) {
            this.statusLabel.string = 'a new friend request';
            this.statusLabel.color = new Color(100, 255, 100, 255); // green
        } else if (hasStolen) {
            this.statusLabel.string = 'this devil stole your fish!!!!';
            this.statusLabel.color = new Color(255, 100, 100, 255); // red
        } else {
            this.statusLabel.string = 'just a friendly guy :)';
        }
    }


    /**
     * handle the visit button click event
     * also, if the friend is in pending state, the visit button will be changed to "accept" button
     * and the button color will be changed to green
     */
    private onVisitClicked() {
        if (this.musicAudioSource && this.clickButtonSound) {
            this.musicAudioSource.playOneShot(this.clickButtonSound);
        }
        if (this.isFriendPending) {
            console.log('Accepting friend request:', this.friendData.uid);
            if (this.onAcceptCallback && this.friendData) {
                this.onAcceptCallback(this.friendData.uid);
            }
            return; // do not call the visit callback if it's a pending friend request
        }
        if (this.onVisitCallback && this.friendData) {
            this.onVisitCallback(this.friendData.uid);
        }
    }

    /**
     * TODO: implement the visit button click handler
     * change to friend's tank scene
     */
    private onVisitCallback: (friendUid: string) => void = (friendUid: string) => { // TODO
        console.log('Visiting friend tank:', friendUid);
                if (TankBGMManager.bgmNode) {
            console.log('Removing BGM node from director');
            director.removePersistRootNode(TankBGMManager.bgmNode);
        }
        // setTimeout(() => {
        //      director.loadScene('?????');
        //  }, 200);
    }


    getFriendData(): FriendData {
        return this.friendData;
    }

    toggleRemoveButton(show: boolean) {
        if (this.removeButton) {
            this.removeButton.node.active = show;
        }
    }


    private onRemoveClicked() {
        if (this.musicAudioSource && this.clickButtonSound) {
            this.musicAudioSource.playOneShot(this.clickButtonSound);
        }
        if (this.onRemoveCallback && this.friendData) {
            this.onRemoveCallback(this.friendData.uid);
        }
    }

    onDestroy() {
        if (this.visitButton && this.visitButton.node && this.visitButton.node.isValid) {
            this.visitButton.node.off(Button.EventType.CLICK, this.onVisitClicked, this);
        }
        if (this.removeButton && this.removeButton.node && this.removeButton.node.isValid) {
            this.removeButton.node.off(Button.EventType.CLICK, this.onRemoveClicked, this);
        }
    }
}