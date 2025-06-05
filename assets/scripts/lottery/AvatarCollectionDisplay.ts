import { _decorator, Component, Node, ScrollView, Prefab, instantiate, Sprite, Label, Button, SpriteFrame, Color } from 'cc';
import { AvatarData, AvatarDatabase, AvatarRarity } from './AvatarData';
import { AvatarManager } from './AvatarManager';
import databaseService, { UserAvatarCollection } from '../firebase/database-service';

const { ccclass, property } = _decorator;

@ccclass('AvatarCollectionDisplay')
export class AvatarCollectionDisplay extends Component {
    @property(Node)
    collectionPanel: Node = null!;

    @property(ScrollView)
    avatarScrollView: ScrollView = null!;

    @property(Node)
    avatarItemContainer: Node = null!;

    @property(Prefab)
    avatarItemPrefab: Prefab = null!;

    @property(Label)
    collectionStatsLabel: Label = null!;

    @property(Button)
    closeButton: Button = null!;

    @property({
        type: AvatarManager,
        tooltip: 'Avatar manager component for sprite loading'
    })
    avatarManager: AvatarManager = null!;

    private userCollection: UserAvatarCollection = {};
    private selectedAvatarId: string | null = null;

    start() {
        this.setupUI();
    }

    private setupUI() {
        if (this.closeButton) {
            this.closeButton.node.on('click', this.hideCollection, this);
        }

        if (this.collectionPanel) {
            this.collectionPanel.active = false;
        }
    }

    public async showCollection() {
        if (this.collectionPanel) {
            this.collectionPanel.active = true;
            await this.loadCollection();
        }
    }

    public hideCollection() {
        if (this.collectionPanel) {
            this.collectionPanel.active = false;
        }
    }

    private async loadCollection() {
        try {
            // Get user's collection and selected avatar
            const [collection, selectedAvatar] = await Promise.all([
                databaseService.getAvatarCollection(),
                databaseService.getSelectedAvatar()
            ]);

            this.userCollection = collection || {};
            this.selectedAvatarId = selectedAvatar;

            this.displayAvatars();
            this.updateStats();
        } catch (error) {
            console.error('Error loading avatar collection:', error);
        }
    }

    private displayAvatars() {
        if (!this.avatarItemContainer) return;

        // Clear existing items
        this.avatarItemContainer.removeAllChildren();

        const allAvatars = AvatarDatabase.getAllAvatars();

        for (const avatar of allAvatars) {
            const itemNode = this.createAvatarItem(avatar);
            this.avatarItemContainer.addChild(itemNode);
        }
    }

    private createAvatarItem(avatar: AvatarData): Node {
        // For now, create a simple node structure
        // In a real implementation, you'd use the avatarItemPrefab
        const itemNode = new Node(`AvatarItem_${avatar.id}`);

        // Add UI components
        const sprite = itemNode.addComponent(Sprite);
        const button = itemNode.addComponent(Button);

        // Set up the item
        this.setupAvatarItem(itemNode, avatar, sprite, button);

        return itemNode;
    } private async setupAvatarItem(itemNode: Node, avatar: AvatarData, sprite: Sprite, button: Button) {
        const isOwned = this.userCollection[avatar.id] !== undefined;
        const isSelected = this.selectedAvatarId === avatar.id;

        // Load sprite using AvatarManager
        if (isOwned && this.avatarManager) {
            const spriteFrame = this.avatarManager.getAvatarSpriteById(avatar.id);
            if (spriteFrame) {
                sprite.spriteFrame = spriteFrame;
            }
        } else {
            // Show silhouette or locked icon
            sprite.color = new Color(100, 100, 100, 255); // Gray tint for locked
        }

        // Set up button
        button.transition = Button.Transition.SCALE;
        button.node.on('click', () => this.onAvatarItemClicked(avatar), this);

        // Visual indicators
        if (isSelected) {
            // Add selection indicator
            itemNode.setScale(1.1, 1.1, 1);
        }

        // Rarity border color
        const rarityColor = new Color();
        rarityColor.fromHEX(AvatarDatabase.getRarityColor(avatar.rarity));
        // Apply border color (would need additional UI elements in real implementation)
    }

    private async onAvatarItemClicked(avatar: AvatarData) {
        const isOwned = this.userCollection[avatar.id] !== undefined;

        if (isOwned) {
            // Set as selected avatar
            await this.selectAvatar(avatar.id);
        } else {
            // Show info about locked avatar
            this.showAvatarInfo(avatar);
        }
    }

    private async selectAvatar(avatarId: string) {
        try {
            await databaseService.setSelectedAvatar(avatarId);
            this.selectedAvatarId = avatarId;

            // Refresh display to show new selection
            this.displayAvatars();

            console.log(`Selected avatar: ${avatarId}`);
        } catch (error) {
            console.error('Error selecting avatar:', error);
        }
    }

    private showAvatarInfo(avatar: AvatarData) {
        // Show popup with avatar info
        console.log(`Avatar: ${avatar.name} - ${avatar.description} (${AvatarDatabase.getRarityDisplayName(avatar.rarity)})`);
        // In real implementation, you'd show a proper info popup
    } private updateStats() {
        if (!this.collectionStatsLabel) return;

        const totalAvatars = AvatarDatabase.getAllAvatars().length;
        const ownedAvatars = Object.keys(this.userCollection).length;

        this.collectionStatsLabel.string = `Collection: ${ownedAvatars}/${totalAvatars} avatars`;
    }

    onDestroy() {
        if (this.closeButton) {
            this.closeButton.node.off('click', this.hideCollection, this);
        }
    }
}
