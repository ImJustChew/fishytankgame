import { _decorator, Component, Node, Prefab, instantiate, ScrollView, Button, director, Label, EditBox, Color } from 'cc';
import socialService, { FriendData, StealAttempt } from './firebase/social-service';
import { FriendItem } from './FriendItem';
import { UITransform } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('FriendListPanel')
export class FriendListPanel extends Component {

    @property(ScrollView)
    scrollView: ScrollView = null;

    @property(Node)
    contentNode: Node = null;

    @property(Prefab)
    friendItemPrefab: Prefab = null;

    @property(Button)
    closeButton: Button = null;

    @property(Button)
    removeFriendButton: Button = null;

    @property(Button)
    addFriendButton: Button = null;

    @property(Node)
    addFriendPanel: Node = null;

    @property(Label)
    notificationLabel: Label = null;

    @property(Button)
    sendRequestButton: Button = null;

    @property(EditBox)
    addFriendEditBox: EditBox = null;

    private friendItems: FriendItem[] = [];
    private stealHistory: { incoming: StealAttempt[]; outgoing: StealAttempt[] } = { incoming: [], outgoing: [] };

    private removeMode: boolean = false; // whether remove button is enabled
    private isAddFriendPanelVisible: boolean = false;

    onLoad() {
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseClicked, this);
        }
        if (!this.contentNode && this.scrollView) {
            this.contentNode = this.scrollView.content;
        }
        if (this.removeFriendButton) {
            this.removeFriendButton.node.on(Button.EventType.CLICK, this.toggleRemoveMode, this);
        }
        if (this.addFriendButton) {
            this.addFriendButton.node.on(Button.EventType.CLICK, this.toggleAddFriendPanel, this);
        }
        if (this.sendRequestButton) {
            this.sendRequestButton.node.on(Button.EventType.CLICK, this.onSendRequest, this);
        }
    }

    start() {
        this.loadFriendsList();
        this.generateTestFriendItems(true); // two testing item, delete after testing
        this.generateTestFriendItems(false); // two testing item, delete after testing
        this.adjustContentHeight();
        this.addFriendPanel.active = false;
        this.isAddFriendPanelVisible = false;
    }


    async loadFriendsList() {
        this.clearFriendItems(); // refresh the whole list
        // 1. load pending friend requests
        try {
            const pendingFriends = await socialService.getPendingFriendsList();
            if (pendingFriends) {
                pendingFriends.sort((a, b) => a.username.localeCompare(b.username));
                for (const friend of pendingFriends) {
                    this.createFriendItem(friend, true); // isPending set to true
                }
            } else {
                console.log('No pending friend requests found');
            }
        } catch (error) {
            console.error('Failed to load pending friend requests:', error);
        }
        // 2. load friends list from social service
        try {
            const friends = await socialService.getFriendsList();
            if (!friends) {
                console.warn('cannot load friends list: No friends found');
                return;
            }

            // load steal history
            const stealHistory = await socialService.getStealHistory();
            if (stealHistory) {
                this.stealHistory = stealHistory;
            }

            friends.sort((a, b) => a.username.localeCompare(b.username));
            for (const friend of friends) { // create new items
                this.createFriendItem(friend, false);
            }

            console.log(`load ${friends.length} friends successfully`);

        } catch (error) {
            console.error('load fail:', error);
        }
    }

    /**
     * create a single friend item
     */
    private createFriendItem(friendData: FriendData, isPending: boolean = false) {
        if (!this.friendItemPrefab || !this.contentNode) {
            console.error('FriendItem prefab or content node is not set');
            return;
        }
        const friendItemNode = instantiate(this.friendItemPrefab);
        const friendItem = friendItemNode.getComponent(FriendItem);

        if (!friendItem) {
            console.error('FriendItem component not found in prefab');
            friendItemNode.destroy();
            return;
        }
        const hasStolen = this.checkIfFriendHasStolen(friendData.uid);
        friendItem.setupFriendItem(
            friendData,
            hasStolen,
            this.onRemoveFriend.bind(this),
            this.onAcceptFriend.bind(this),
            isPending
        );

        friendItem.toggleRemoveButton(this.removeMode);

        this.contentNode.addChild(friendItemNode);
        this.friendItems.push(friendItem);
    }

    /**
     * check if a friend has stolen from the player
     */
    private checkIfFriendHasStolen(friendUid: string): boolean {
        // if prefix of uid is 'test', return false
        if (friendUid.startsWith('test')) {
            // randomly return true or false
            return Math.random() < 0.5;
        }
        return this.stealHistory.incoming.some(attempt =>
            attempt.thiefUid === friendUid && attempt.success
        );
    }


    /**
     * Clear all friend items
     */
    private clearFriendItems() {
        this.friendItems.forEach(item => {
            if (item && item.node && item.node.isValid) {
                try {
                    item.node.destroy();
                } catch (error) {
                    console.warn('Error destroying friend item node:', error);
                }
            }
        });
        this.friendItems = [];
    }


    private onCloseClicked() {
        if (this.removeMode) {
            this.toggleRemoveMode();
        }
        if (this.isAddFriendPanelVisible) {
            this.toggleAddFriendPanel();
        }
        if (this.addFriendEditBox) {
            this.addFriendEditBox.string = '';
        }
        if (this.notificationLabel) {
            this.notificationLabel.node.active = false;
        }
        this.node.active = false;
        console.log('friends panel closed');
    }


    /**
     * show the friends panel
     */
    show() {
        this.node.active = true;
        this.addFriendPanel.active = false;
        this.loadFriendsList();
    }

    /**
     * hide the friends panel
     */
    hide() {
        this.node.active = false;
    }

    /**
     * set the visibility of the friends panel
     */
    setVisible(visible: boolean) {
        if (visible) {
            this.show();
        } else {
            this.hide();
        }
    }


    private toggleRemoveMode() {
        this.removeMode = !this.removeMode;
        this.friendItems.forEach(item => {
            item.toggleRemoveButton(this.removeMode);
        });
    }

    // Haven't test this function yet
    private async onRemoveFriend(friendUid: string) {
        console.log(`Removing friend with UID: ${friendUid}`);
        const result = await socialService.removeFriend(friendUid);
        if (result.success) {
            this.loadFriendsList(); // reload the friends list
        } else {
            console.warn(result.message);
        }
    }

    // Haven't test this function yet too
    private async onAcceptFriend(friendUid: string) {
        const result = await socialService.acceptFriendRequest(friendUid);
        if (result.success) {
            this.loadFriendsList(); // 刷新好友列表
        } else {
            console.warn(result.message);
        }
    }


    /**
     * 測試用：生成兩個 FriendItem 加到 contentNode
     */
    private generateTestFriendItems(pending: boolean = false) {
        const testFriends: FriendData[] = [
            {
                uid: 'test1',
                username: 'Alice',
                email: 'alice@example.com',
                money: 100,
                lastOnline: Date.now() - 1000 * 60 * 5
            },
            {
                uid: 'test2',
                username: 'Bob',
                email: 'bob@example.com',
                money: 200,
                lastOnline: Date.now() - 1000 * 60 * 60,
            }
        ];

        testFriends.forEach(friend => {
            this.createFriendItem(friend, pending); // isPending set to true for testing
        });
    }

    /**
     * Adjust the content height based on the number of friend items
     */
    private adjustContentHeight() {
        if (this.contentNode && this.friendItems.length > 0) {
            const itemHeight = this.friendItemPrefab.data.height || 50; // default height if not set
            const totalHeight = (itemHeight + 20) * this.friendItems.length;
            const uiTrans = this.contentNode.getComponent(UITransform);
            if (uiTrans) {
                uiTrans.height = totalHeight + 10;
            }
        }
    }

    private toggleAddFriendPanel() {
        this.isAddFriendPanelVisible = !this.isAddFriendPanelVisible;
        this.addFriendPanel.active = this.isAddFriendPanelVisible;
        if (this.isAddFriendPanelVisible) {
            // Reset the add friend panel or perform any necessary setup
            console.log('Add Friend Panel is now visible');
        } else {
            console.log('Add Friend Panel is now hidden');
            if (this.addFriendEditBox) {
                this.addFriendEditBox.string = '';
            }
            if (this.notificationLabel) {
                this.notificationLabel.node.active = false;
            }
        }
    }


    private async onSendRequest() {
        if (!this.addFriendEditBox) return;
        const identifier = this.addFriendEditBox.string.trim();
        if (!identifier) {
            this.showNotification('Please enter something', false);
            return;
        }
        const result = await socialService.sendFriendRequest(identifier);
        this.showNotification(result.message, result.success);
    }

    private showNotification(message: string, success: boolean = true) {
        if (!this.notificationLabel) return;
        this.notificationLabel.string = message;
        this.notificationLabel.color = success ? new Color(100, 255, 100, 255) : new Color(255, 100, 100, 255);
        this.notificationLabel.node.active = true;
        this.scheduleOnce(() => {
            this.notificationLabel.node.active = false;
        }, 3);
    }

    onDestroy() {
        if (this.closeButton && this.closeButton.node && this.closeButton.node.isValid) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseClicked, this);
        }
        if (this.removeFriendButton && this.removeFriendButton.node && this.removeFriendButton.node.isValid) {
            this.removeFriendButton.node.off(Button.EventType.CLICK, this.toggleRemoveMode, this);
        }
        if (this.sendRequestButton && this.sendRequestButton.node && this.sendRequestButton.node.isValid) {
            this.sendRequestButton.node.off(Button.EventType.CLICK, this.onSendRequest, this);
        }
        this.clearFriendItems();
    }
}