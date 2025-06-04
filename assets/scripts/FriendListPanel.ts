import { _decorator, Component, Node, Prefab, instantiate, ScrollView, Button, director } from 'cc';
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

    private friendItems: FriendItem[] = [];
    private stealHistory: { incoming: StealAttempt[]; outgoing: StealAttempt[] } = { incoming: [], outgoing: [] };

    private removeMode: boolean = false; // whether remove button is enabled

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
    }

    start() {
        this.loadFriendsList();
        this.generateTestFriendItems(); // two testing item, delete after testing
        this.generateTestFriendItems(); // two testing item, delete after testing
        this.adjustContentHeight();
    }


    async loadFriendsList() {
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
            this.clearFriendItems(); // clear existing items
            for (const friend of friends) { // create new items
                this.createFriendItem(friend);
            }

            console.log(`load ${friends.length} friends successfully`);

        } catch (error) {
            console.error('load fail:', error);
        }
    }

    /**
     * create a single friend item
     */
    private createFriendItem(friendData: FriendData) {
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
            this.onRemoveFriend.bind(this)
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
        this.node.active = false;
        console.log('friends panel closed');
    }


    /**
     * show the friends panel
     */
    show() {
        this.node.active = true;
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


    /**
     * 測試用：生成兩個 FriendItem 加到 contentNode
     */
    private generateTestFriendItems() {
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
            this.createFriendItem(friend);
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

    onDestroy() {
        if (this.closeButton && this.closeButton.node && this.closeButton.node.isValid) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseClicked, this);
        }
        if (this.removeFriendButton && this.removeFriendButton.node && this.removeFriendButton.node.isValid) {
            this.removeFriendButton.node.off(Button.EventType.CLICK, this.toggleRemoveMode, this);
        }
        this.clearFriendItems();
    }
}