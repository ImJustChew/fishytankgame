import { _decorator, Component, Node, Button } from 'cc';
import { FriendListPanel } from './FriendListPanel';

const { ccclass, property } = _decorator;

@ccclass('MainUIController')
export class MainUIController extends Component {
    
    @property(Button)
    friendListButton: Button = null;
    
    @property(FriendListPanel)
    friendListPanel: FriendListPanel = null;

    onLoad() {
        if (this.friendListButton) {
            console.log('[MainUIController] Friend List Button found, setting up click listener.');
            this.friendListButton.node.on(Button.EventType.CLICK, this.onFriendListClicked, this);
        }

        if (this.friendListPanel) {
            this.friendListPanel.hide();
        }
    }


    private onFriendListClicked() {
        console.log('[MainUIController] Friend List Button clicked.');
        if (this.friendListPanel) {
            this.friendListPanel.show();
        }
    }

    onDestroy() {
        if (this.friendListButton) {
            this.friendListButton.node.off(Button.EventType.CLICK, this.onFriendListClicked, this);
        }
    }
}