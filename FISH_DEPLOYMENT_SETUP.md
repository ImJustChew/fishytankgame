# Fish Deployment Panel Setup Guide

## Issues Fixed in Code:

1. ✅ **Fish ID Mismatch**: Updated all old fish IDs to use correct ones (fish_001, fish_002, etc.)
2. ✅ **FishManager Integration**: Added FishManager integration to both BattleTankManager and FishDeploymentPanel
3. ✅ **Sprite Display**: Fixed fish sprite setting in battle system and deployment panel
4. ✅ **Debug Utilities**: Added comprehensive debugging methods to help identify prefab issues

## Required Prefab/Scene Setup in Cocos Creator:

### 1. FishSlot.prefab Structure

The FishSlot.prefab should have this structure:

```
FishSlot (Node)
├── FishIcon (Node) - with Sprite component
├── Count (Node) - with Label component
└── Name (Node) - with Label component (optional)
```

**Alternative structure:**

```
FishSlot (Node) - with Sprite and Label components directly
```

### 2. BattleScene Setup Requirements:

#### BattleSceneManager Component:

- **FishManager**: Must be assigned to a FishManager instance in the scene
- **FishDeploymentPanel**: Must be assigned
- **BattleTankManager**: Must be assigned

#### FishDeploymentPanel Component:

- **fishSlotPrefab**: Assign the FishSlot.prefab
- **fishSlotsContainer**: Assign a parent node where slots will be created
- **deploymentArea**: Assign the area where fish can be dropped
- **dragPreview**: Assign a node that shows during drag operations
- **fishManager**: Should be automatically set by BattleSceneManager

#### BattleTankManager Component:

- **fishManager**: Should be automatically set by BattleSceneManager
- **battleFishPrefab**: Assign the BattleFish.prefab
- **battleTank**: Assign the BattleTank component

### 3. Testing and Debugging:

The FishDeploymentPanel now includes debug methods that will log detailed information:

- **enableDeploymentAndDebug()**: Enables deployment and runs all debug checks
- **debugPrefabStructure()**: Shows prefab setup information
- **testTouchEvents()**: Verifies touch event setup

## Common Issues and Solutions:

### Issue: Fish images not showing

**Check:**

1. FishManager assigned to BattleSceneManager
2. FishSlot prefab has Sprite component in correct location
3. FishManager has sprite frames properly assigned

### Issue: Count numbers not showing

**Check:**

1. FishSlot prefab has Label component
2. Label component is named "Count" or in expected location
3. Check console logs for "Found label" messages

### Issue: Drag not working

**Check:**

1. FishSlot prefab has UITransform component
2. deploymentArea is properly assigned
3. isDeploymentEnabled is true
4. Check console logs for touch event setup

## Debug Console Commands:

When the battle scene loads, you should see logs like:

```
=== FishDeploymentPanel Debug Info ===
FishManager set: true
Fish slot prefab set: true
...
```

If any of these show `false`, check the corresponding assignments in the editor.
