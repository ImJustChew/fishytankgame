import { EventTarget } from 'cc';

/**
 * ProfileEvents
 * 
 * A simple event system for profile-related events in the application.
 * Uses CC's built-in EventTarget for event handling.
 */
class ProfileEvents extends EventTarget {
    // Event types
    static readonly PROFILE_CREATED = 'profile-created';
    static readonly PROFILE_UPDATED = 'profile-updated';
    
    // Singleton instance
    private static _instance: ProfileEvents | null = null;
    
    /**
     * Get the singleton instance
     */
    public static getInstance(): ProfileEvents {
        if (!ProfileEvents._instance) {
            ProfileEvents._instance = new ProfileEvents();
        }
        return ProfileEvents._instance;
    }
    
    /**
     * Emit an event when a profile is created
     * @param username The username of the created profile
     */
    public emitProfileCreated(username: string): void {
        this.emit(ProfileEvents.PROFILE_CREATED, username);
    }
    
    /**
     * Emit an event when a profile is updated
     * @param userData The updated user data
     */
    public emitProfileUpdated(userData: any): void {
        this.emit(ProfileEvents.PROFILE_UPDATED, userData);
    }
}

export default ProfileEvents.getInstance();
