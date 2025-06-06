import { _decorator, Component, EditBox, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CustomInputBox')
export class CustomInputBox extends Component {
    @property(EditBox)
    editBox: EditBox = null;

    @property(Label)
    displayLabel: Label = null;


    onLoad() {
        if (this.editBox) {
            this.editBox.node.on('text-changed', this.onTextChanged, this);
            this.editBox.node.on('editing-did-began', this.onTextChanged, this);
            this.editBox.node.on('editing-did-ended', this.onTextChanged, this);
        }
        this.updateDisplay();
    }

    onTextChanged() {
        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.editBox || !this.displayLabel) return;
        const text = this.editBox.string;
        if (text.length > 0) {
            this.displayLabel.string = text;
            this.displayLabel.node.active = true;
        } else {
            this.displayLabel.string = "";
            this.displayLabel.node.active = true;
        }
    }
}