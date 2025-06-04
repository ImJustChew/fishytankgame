import { _decorator, Component, Node, Label, Button, Color } from 'cc';
import { FriendData, StealAttempt } from './firebase/social-service';

const { ccclass, property } = _decorator;

@ccclass('FriendItem')
export class FriendItem extends Component {

    @property(Label)
    usernameLabel: Label = null;

    @property(Label)
    lastLoginLabel: Label = null;

    @property(Label)
    statusLabel: Label = null;

    @property(Button)
    visitButton: Button = null;

    @property(Button)
    removeButton: Button = null;

    private friendData: FriendData = null;
    private onRemoveCallback: (friendUid: string) => void = null;

    onLoad() {
        if (this.visitButton) {
            this.visitButton.node.on(Button.EventType.CLICK, this.onVisitClicked, this);
        }
        if (this.removeButton) {
            this.removeButton.node.on(Button.EventType.CLICK, this.onRemoveClicked, this);
        }
    }

    /**
     * initializes the friend item with data
     */
    setupFriendItem(
        friendData: FriendData,
        hasStolen: boolean,
        onRemoveCallback?: (friendUid: string) => void
    ) {
        this.friendData = friendData;
        this.onRemoveCallback = onRemoveCallback || null;

        if (this.usernameLabel) {
            this.usernameLabel.string = friendData.username;
        }
        if (this.lastLoginLabel) {
            this.lastLoginLabel.string = this.formatLastLogin(friendData.lastOnline);
        }
        if (this.statusLabel) {
            this.setupFriendStatus(hasStolen);
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
        if (hasStolen) {
            this.statusLabel.string = 'this devil stole your fish!!!!';
            this.statusLabel.color = new Color(255, 100, 100, 255); // red
        } else {
            this.statusLabel.string = 'just a friendly guy :)';
            this.statusLabel.color = new Color(100, 255, 100, 255); // green
        }
    }


    private onVisitClicked() {
        if (this.onVisitCallback && this.friendData) {
            this.onVisitCallback(this.friendData.uid);
        }
    }

    /**
     * TODO: implement the visit button click handler
     */
    private onVisitCallback: (friendUid: string) => void = null; //  TODO


    getFriendData(): FriendData {
        return this.friendData;
    }

    toggleRemoveButton(show: boolean) {
        if (this.removeButton) {
            this.removeButton.node.active = show;
        }
    }


    private onRemoveClicked() {
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