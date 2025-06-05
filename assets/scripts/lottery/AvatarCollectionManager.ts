import { _decorator, Component, Node, instantiate, Prefab, Label, Button, ScrollView, Layout } from 'cc';
import { AvatarData, AvatarDatabase, AvatarRarity } from './AvatarData';
import { AvatarCollectionItem } from './AvatarCollectionItem';
import databaseService, { UserAvatarCollection } from '../firebase/database-service';

const { ccclass, property } = _decorator;
@ccclass('AvatarCollectionManager')
export class AvatarCollectionManager extends Component {
    @property(ScrollView)
    scrollView: ScrollView = null;

    @property(Node)
    contentContainer: Node = null;

    @property(Prefab)
    avatarItemPrefab: Prefab = null;

    @property(Button)
    backButton: Button = null;

    @property(Label)
    collectionStatsLabel: Label = null;

    @property(Button)
    lotteryButton: Button = null;

    private userCollection: UserAvatarCollection = {};
    private selectedAvatarId: string = null;
    private avatarItems: AvatarCollectionItem[] = [];

    start() {
        this.setupEventHandlers();
        this.loadCollection();
    }

    private setupEventHandlers() {
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackButtonClicked, this);
        }

        if (this.lotteryButton) {
            this.lotteryButton.node.on(Button.EventType.CLICK, this.onLotteryButtonClicked, this);
        }
    }

    private async loadCollection() {
        try {
            // Load user's avatar collection and selected avatar
            const [collection, selectedAvatar] = await Promise.all([
                databaseService.getAvatarCollection(),
                databaseService.getSelectedAvatar()
            ]);

            this.userCollection = collection || {};
            this.selectedAvatarId = selectedAvatar;

            this.displayCollection();
            this.updateCollectionStats();
        } catch (error) {
            console.error('Error loading avatar collection:', error);
        }
    }

    private displayCollection() {
        if (!this.contentContainer || !this.avatarItemPrefab) {
            console.error('Missing required components for collection display');
            return;
        }

        // Clear existing items
        this.clearAvatarItems();

        // Get all available avatars
        const allAvatars = AvatarDatabase.getAllAvatars();

        // Sort avatars by rarity (legendary first, then epic, rare, common)
        const rarityOrder = [AvatarRarity.LEGENDARY, AvatarRarity.EPIC, AvatarRarity.RARE, AvatarRarity.COMMON];
        allAvatars.sort((a, b) => {
            const aOrder = rarityOrder.indexOf(a.rarity);
            const bOrder = rarityOrder.indexOf(b.rarity);
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            return a.name.localeCompare(b.name);
        });

        // Create item for each avatar
        for (const avatar of allAvatars) {
            const isUnlocked = this.userCollection.hasOwnProperty(avatar.id);
            const isSelected = this.selectedAvatarId === avatar.id;

            const itemNode = instantiate(this.avatarItemPrefab);
            const itemComponent = itemNode.getComponent(AvatarCollectionItem);

            if (itemComponent) {
                itemComponent.initialize(avatar, isUnlocked, isSelected, this.onAvatarSelected.bind(this));
                this.avatarItems.push(itemComponent);
            }

            this.contentContainer.addChild(itemNode);
        }

        // Refresh layout
        const layout = this.contentContainer.getComponent(Layout);
        if (layout) {
            layout.updateLayout();
        }
    }

    private clearAvatarItems() {
        this.avatarItems = [];
        if (this.contentContainer) {
            this.contentContainer.removeAllChildren();
        }
    }

    private updateCollectionStats() {
        if (!this.collectionStatsLabel) return;

        const totalAvatars = AvatarDatabase.getAllAvatars().length;
        const unlockedCount = Object.keys(this.userCollection).length;
        const percentage = Math.round((unlockedCount / totalAvatars) * 100);

        this.collectionStatsLabel.string = `Collection: ${unlockedCount}/${totalAvatars} (${percentage}%)`;
    }

    private async onAvatarSelected(avatarId: string) {
        try {
            // Update selected avatar in database
            await databaseService.setSelectedAvatar(avatarId);

            // Update local state
            this.selectedAvatarId = avatarId;

            // Update visual state of all items
            for (const item of this.avatarItems) {
                item.setSelected(false);
            }

            // Find and select the chosen avatar
            const selectedItem = this.avatarItems.find(item => item['avatarData']?.id === avatarId);
            if (selectedItem) {
                selectedItem.setSelected(true);
            }

            console.log(`Selected avatar: ${avatarId}`);
        } catch (error) {
            console.error('Error selecting avatar:', error);
        }
    }

    private onBackButtonClicked() {
        // Navigate back to previous scene
        console.log('Back button clicked - implement scene navigation');
    }

    private onLotteryButtonClicked() {
        // Navigate to lottery scene
        console.log('Lottery button clicked - implement scene navigation to lottery');
    }

    public refreshCollection() {
        this.loadCollection();
    }

    onDestroy() {
        // Clean up event handlers
        if (this.backButton) {
            this.backButton.node.off(Button.EventType.CLICK, this.onBackButtonClicked, this);
        }

        if (this.lotteryButton) {
            this.lotteryButton.node.off(Button.EventType.CLICK, this.onLotteryButtonClicked, this);
        }

        this.clearAvatarItems();
    }
}
