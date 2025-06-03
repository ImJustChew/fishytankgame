import { _decorator, Component, Node, Prefab, instantiate, ScrollView, Button, director } from 'cc';
import socialService, { FriendData, StealAttempt } from './firebase/social-service';
import { FriendItem } from './FriendItem';

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

    private friendItems: FriendItem[] = [];
    private stealHistory: { incoming: StealAttempt[]; outgoing: StealAttempt[] } = { incoming: [], outgoing: [] };

    onLoad() {
        if (this.closeButton) {
            this.closeButton.node.on(Button.EventType.CLICK, this.onCloseClicked, this);
        }
        if (!this.contentNode && this.scrollView) {
            this.contentNode = this.scrollView.content;
        }
    }

    start() {
        this.loadFriendsList();
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
            hasStolen
        );

        this.contentNode.addChild(friendItemNode);
        this.friendItems.push(friendItem);
    }

    /**
     * check if a friend has stolen from the player
     */
    private checkIfFriendHasStolen(friendUid: string): boolean {
        return this.stealHistory.incoming.some(attempt => 
            attempt.thiefUid === friendUid && attempt.success
        );
    }


    /**
     * Clear all friend items
     */
    private clearFriendItems() {
        this.friendItems.forEach(item => {
            if (item.node && item.node.isValid) {
                item.node.destroy();
            }
        });
        this.friendItems = [];
    }


    private onCloseClicked() {
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

    onDestroy() {
        if (this.closeButton) {
            this.closeButton.node.off(Button.EventType.CLICK, this.onCloseClicked, this);
        }
        this.clearFriendItems();
    }
}