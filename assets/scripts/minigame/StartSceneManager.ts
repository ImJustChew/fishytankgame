import { _decorator, Button, Component, EditBox, Label, Node } from 'cc';
import { EventManager } from './EventManager';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('StartSceneManager')
export class StartSceneManager extends Component {
  @property(Button)
  public startGameButton: Button = null; // Renamed from createRoomButton
  @property(Button)
  public quitButton: Button = null;
  @property(Button)
  public confirmButton: Button = null;
  @property(Button)
  public closeButton: Button = null;
  @property(Node)
  public panelStart: Node = null;
  @property(Node)
  public popupModal: Node = null;
  @property(Label)
  public modalText: Label = null;
  @property(EditBox)
  public playerNameInput: EditBox = null;

  protected onLoad(): void {
    console.log('StartSceneManager onLoad - Singleplayer Mode');
    // 註冊事件 (singleplayer events only)
    EventManager.eventTarget.on('init-start-scene', this.initButtons, this);
  }

  start() {
    // 隨機玩家名稱
    const randomName = `player${Math.floor(Math.random() * 1000)}`;
    this.playerNameInput.string = randomName;
    this.initButtons();
  }

  protected onDestroy(): void {
    // 註銷事件
    EventManager.eventTarget.off('init-start-scene', this.initButtons, this);
  }

  initButtons() {
    console.log('StartSceneManager initButtons - Singleplayer');
    // 將 StartScene 的按鈕改成可互動
    this.startGameButton.interactable = true;
    this.quitButton.interactable = true;
  }

  onClickStartGame() {
    if (this.playerNameInput.string.trim() === '') {
      this.showPopupModal('請輸入玩家名稱');
    } else {
      // Start singleplayer game directly
      console.log(`Starting singleplayer game for: ${this.playerNameInput.string}`);
      
      // Store player name for later use (optional)
      localStorage.setItem('playerName', this.playerNameInput.string);
      
      // Disable button during scene transition
      this.startGameButton.interactable = false;
      
      // Load game scene directly (no room creation needed)
      GameManager.instance.loadGameScene();
    }
  }

  onClickQuit() {
    // Quit application or return to main menu
    console.log('Quit game');
    // You can add quit logic here, such as:
    // - Return to main menu
    // - Close application
    // - Show quit confirmation dialog
    this.showPopupModal('感謝遊玩！');
  }

  onClickClose() {
    this.popupModal.active = false;
    this.modalText.string = '';
  }

  onClickConfirm() {
    this.popupModal.active = false;
    this.modalText.string = '';
  }

  // Helper method to show popup messages
  showPopupModal(message: string) {
    this.popupModal.active = true;
    this.modalText.string = message;
  }

  // Show error when game fails to start
  showGameStartError() {
    this.showPopupModal('遊戲啟動失敗，請重試');
    this.startGameButton.interactable = true;
  }
}
