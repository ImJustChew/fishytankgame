import { _decorator, Component, Node, Label, EditBox, Button } from 'cc';
import databaseService from './firebase/database-service';
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from './constants';

const { ccclass, property } = _decorator;

@ccclass('UsernameDialog')
export class UsernameDialog extends Component {
    @property(Node)
    dialogRoot: Node | null = null;

    @property(EditBox)
    usernameInput: EditBox | null = null;

    @property(Button)
    confirmButton: Button | null = null; @property(Label)
    errorLabel: Label | null = null;

    private onConfirmCallback: ((username: string) => void) | null = null;

    start() {
        this.setupEventListeners();
        this.hide();
    } private setupEventListeners() {
        if (this.confirmButton) {
            this.confirmButton.node.on(Button.EventType.CLICK, this.onConfirmClick, this);
        }

        if (this.usernameInput) {
            this.usernameInput.node.on(EditBox.EventType.TEXT_CHANGED, this.onTextChanged, this);
        }
    }

    show(onConfirm: (username: string) => void) {
        this.onConfirmCallback = onConfirm;

        if (this.dialogRoot) {
            this.dialogRoot.active = true;
        }

        this.clearError();
        if (this.usernameInput) {
            this.usernameInput.string = '';
        }
    }

    hide() {
        if (this.dialogRoot) {
            this.dialogRoot.active = false;
        }
    }

    private onTextChanged() {
        this.clearError();
    }

    private async onConfirmClick() {
        const username = this.usernameInput?.string?.trim() || '';

        if (!this.validateUsername(username)) {
            return;
        }

        // Disable button while checking
        if (this.confirmButton) {
            this.confirmButton.interactable = false;
        }

        try {
            const isAvailable = await databaseService.isUsernameAvailable(username);

            if (!isAvailable) {
                this.showError('Username is already taken. Please choose another one.');
                return;
            }            // Username is valid and available
            this.hide();
            if (this.onConfirmCallback) {
                this.onConfirmCallback(username);
            }

        } catch (error) {
            console.error('Error checking username availability:', error);
            this.showError('Error checking username. Please try again.');
        } finally {
            // Re-enable button
            if (this.confirmButton) {
                this.confirmButton.interactable = true;
            }
        }
    }

    private validateUsername(username: string): boolean {
        if (username.length < USERNAME_MIN_LENGTH) {
            this.showError(`Username must be at least ${USERNAME_MIN_LENGTH} characters long.`);
            return false;
        }

        if (username.length > USERNAME_MAX_LENGTH) {
            this.showError(`Username must be no more than ${USERNAME_MAX_LENGTH} characters long.`);
            return false;
        }

        // Check for valid characters (alphanumeric and underscore)
        const validUsernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!validUsernameRegex.test(username)) {
            this.showError('Username can only contain letters, numbers, and underscores.');
            return false;
        }

        return true;
    }

    private showError(message: string) {
        if (this.errorLabel) {
            this.errorLabel.string = message;
            this.errorLabel.node.active = true;
        }
    }

    private clearError() {
        if (this.errorLabel) {
            this.errorLabel.string = '';
            this.errorLabel.node.active = false;
        }
    }

    onDestroy() {
        if (this.confirmButton && this.confirmButton.node) {
            this.confirmButton.node.off(Button.EventType.CLICK, this.onConfirmClick, this);
        }
        if (this.usernameInput && this.usernameInput.node) {
            this.usernameInput.node.off(EditBox.EventType.TEXT_CHANGED, this.onTextChanged, this);
        }
    }
}
