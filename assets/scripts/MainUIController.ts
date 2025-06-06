import { _decorator, Component, Node, Button, director } from 'cc';
import { FriendListPanel } from './FriendListPanel';

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

        if (this.friendListPanel) {
            this.friendListPanel.hide();
        }
    }


    private onFriendListClicked() {
        console.log('[MainUIController] Friend List Button clicked.');
        if (!this.friendListPanel.node.active) {
            if (this.friendListPanel) {
                this.friendListPanel.show();
            }
        }
    }


    private onExitClicked() {
        if (!this.friendListPanel.node.active) {
            console.log('[MainUIController] Exit Button clicked.');
            director.loadScene('mainmenu');
        }
    }

    private onShopClicked() {
        if (!this.friendListPanel.node.active) {
            console.log('[MainUIController] Shop Button clicked.');
            director.loadScene('shopmenu');
        }
    }

    onDestroy() {
        if (this.friendListButton) {
            this.friendListButton.node.off(Button.EventType.CLICK, this.onFriendListClicked, this);
        }
    }
}