# UI Components Documentation

This document describes the UI components for start button control and settings management in the Fish Tank Game.

## Overview

The UI system includes:

- **StartButtonController**: Login-aware start button that's disabled until user is authenticated
- **AudioManager**: Singleton audio system for BGM and SFX management with persistent settings
- **SettingsDialog**: Complete settings UI with volume controls and audio toggles
- **SettingsButtonController**: Simple controller to open settings dialog

## Components

### 1. StartButtonController.ts

A smart start button that automatically enables/disables based on user authentication status.

**Features:**

- Monitors authentication state in real-time
- Automatically enables when user has complete profile (logged in + username selected)
- Visual feedback with configurable enabled/disabled colors
- Proper cleanup of event listeners

**Properties to assign in the editor:**

- `startButton`: The Button component for starting the game
- `disabledColor`: Color when button is disabled (default: gray)
- `enabledColor`: Color when button is enabled (default: white)

**States:**

- **Disabled (Gray)**: User not logged in or incomplete profile
- **Enabled (Normal)**: User logged in with complete profile

### 2. AudioManager.ts

Singleton audio management system with persistent settings.

**Features:**

- Singleton pattern for global access
- Persistent volume settings using localStorage
- Separate BGM and SFX control
- Loop BGM playback
- One-shot SFX playback
- Enable/disable toggles for each audio type

**Properties to assign in the editor:**

- `bgmAudioSource`: AudioSource for background music
- `sfxAudioSource`: AudioSource for sound effects
- `bgmClips`: Array of AudioClip for background music
- `sfxClips`: Array of AudioClip for sound effects

**Storage Keys:**

- `fishytank_bgm_volume`: BGM volume (0.0 - 1.0)
- `fishytank_sfx_volume`: SFX volume (0.0 - 1.0)
- `fishytank_bgm_enabled`: BGM enabled state (true/false)
- `fishytank_sfx_enabled`: SFX enabled state (true/false)

**Default Settings:**

- BGM Volume: 70%
- SFX Volume: 80%
- BGM Enabled: true
- SFX Enabled: true

### 3. SettingsDialog.ts

Complete settings UI with volume sliders and toggle controls.

**Features:**

- BGM volume slider with percentage display
- SFX volume slider with percentage display
- Enable/disable toggles for BGM and SFX
- Real-time audio feedback
- Settings reset functionality
- Automatic UI state synchronization

**Properties to assign in the editor:**

- `dialogRoot`: Root node of the settings dialog (for show/hide)
- `closeButton`: Button to close the dialog
- `bgmVolumeSlider`: Slider for BGM volume (0-100%)
- `bgmVolumeLabel`: Label showing BGM volume percentage
- `bgmToggle`: Toggle for enabling/disabling BGM
- `sfxVolumeSlider`: Slider for SFX volume (0-100%)
- `sfxVolumeLabel`: Label showing SFX volume percentage
- `sfxToggle`: Toggle for enabling/disabling SFX
- `resetButton`: Button to reset all settings to defaults

### 4. SettingsButtonController.ts

Simple controller for opening the settings dialog.

**Properties to assign in the editor:**

- `settingsButton`: Button to open settings
- `settingsDialog`: Reference to SettingsDialog component

## Setup Instructions

### 1. Audio Manager Setup

```
Create AudioManager Node:
├── AudioManager (Component: AudioManager)
├── BGM_AudioSource (Component: AudioSource)
└── SFX_AudioSource (Component: AudioSource)
```

1. Create a persistent node with `AudioManager` component
2. Add two child nodes with `AudioSource` components
3. Assign audio sources to the AudioManager properties
4. Add your audio clips to the BGM and SFX arrays
5. Place this node in your main/loading scene so it persists

### 2. Start Button Setup

```
UI Canvas:
└── StartButton (Component: Button + StartButtonController)
```

1. Create a button with `StartButtonController` component
2. Assign the button reference to the controller
3. Configure enabled/disabled colors as desired
4. The button will automatically manage its state

### 3. Settings Dialog Setup

```
UI Canvas:
└── SettingsDialog (Component: SettingsDialog)
    ├── Background
    ├── CloseButton (Component: Button)
    ├── BGM Controls
    │   ├── BGMVolumeSlider (Component: Slider)
    │   ├── BGMVolumeLabel (Component: Label)
    │   └── BGMToggle (Component: Toggle)
    ├── SFX Controls
    │   ├── SFXVolumeSlider (Component: Slider)
    │   ├── SFXVolumeLabel (Component: Label)
    │   └── SFXToggle (Component: Toggle)
    └── ResetButton (Component: Button)
```

1. Create a dialog UI with all the required components
2. Assign all UI elements to the SettingsDialog properties
3. Initially hide the dialog (set dialogRoot active = false)

### 4. Settings Button Setup

```
UI Canvas:
└── SettingsButton (Component: Button + SettingsButtonController)
```

1. Create a button with `SettingsButtonController` component
2. Assign button and settings dialog references
3. Button will open the settings dialog when clicked

## Usage Examples

### Accessing Audio Manager

```typescript
// Get the singleton instance
const audioManager = AudioManager.getInstance();

if (audioManager) {
  // Play BGM
  audioManager.playBGM(0);

  // Play sound effect
  audioManager.playSFX("button_click");

  // Change volume
  audioManager.setBGMVolume(0.5); // 50%
  audioManager.setSFXVolume(0.8); // 80%

  // Enable/disable audio
  audioManager.setBGMEnabled(false);
  audioManager.setSFXEnabled(true);
}
```

### Manually Control Start Button

```typescript
// Get reference to start button controller
const startController = this.getComponent(StartButtonController);

// Force refresh authentication state
startController.refreshButtonState();

// Manually enable/disable (for testing)
startController.setButtonEnabled(true);
```

### Control Settings Dialog

```typescript
// Get reference to settings dialog
const settingsDialog = this.getComponent(SettingsDialog);

// Show/hide dialog
settingsDialog.show();
settingsDialog.hide();

// Toggle visibility
settingsDialog.toggle();

// Check if visible
if (settingsDialog.isVisible()) {
  console.log("Settings dialog is open");
}
```

## Integration with Authentication System

The start button automatically integrates with the authentication system:

1. **User Signs In**: Button remains disabled until profile is complete
2. **Username Selected**: Button enables automatically
3. **User Signs Out**: Button disables automatically
4. **Authentication State Changes**: Button updates in real-time

## Audio Workflow

### Recommended Audio Setup:

1. **BGM**: Longer, looping background music tracks
2. **SFX**: Short sound effects for UI interactions
3. **Organization**: Name your clips clearly (e.g., 'button_click', 'success', 'error')

### Performance Considerations:

- Use compressed audio formats for web deployment
- Keep SFX clips short to minimize memory usage
- Use AudioSource pooling for frequent SFX if needed
- BGM should be set to loop automatically

## Persistence

### Audio Settings:

- All audio settings are automatically saved to localStorage
- Settings persist across app restarts
- No manual save/load required

### Start Button State:

- Button state is dynamically determined from authentication
- No persistence needed - always reflects current auth state

## Error Handling

### Audio Manager:

- Gracefully handles missing audio clips
- Logs warnings for invalid clip names
- Continues operation if audio sources are not assigned

### Settings Dialog:

- Handles missing AudioManager instance
- Updates UI safely when components are not assigned
- Provides fallback behavior for invalid values

### Start Button:

- Safe operation when authentication service is unavailable
- Proper cleanup of event listeners
- Handles missing button assignments gracefully

## Customization

### Colors:

- Modify `disabledColor` and `enabledColor` in StartButtonController
- Use any Color values that fit your game's theme

### Audio Settings:

- Adjust default volumes in AudioManager constructor
- Modify storage keys if needed for your game
- Add more audio types by extending the AudioSettings interface

### UI Layout:

- Customize settings dialog layout to match your design
- Add more settings options by extending the dialog component
- Style sliders and toggles to match your game's aesthetics

## Future Enhancements

Potential improvements could include:

- Graphics quality settings
- Control remapping options
- Language selection
- Accessibility options
- Custom keybinding support
- Advanced audio settings (reverb, filters, etc.)
