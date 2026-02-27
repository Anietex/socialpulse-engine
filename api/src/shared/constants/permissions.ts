export enum Permission {
  // User permissions
  READ_OWN_PROFILE = 'read:own:profile',
  UPDATE_OWN_PROFILE = 'update:own:profile',
  DELETE_OWN_ACCOUNT = 'delete:own:account',
  READ_OWN_TWEETS = 'read:own:tweets',
  DELETE_OWN_TWEETS = 'delete:own:tweets',
  READ_OWN_ANALYTICS = 'read:own:analytics',
  UPDATE_OWN_SETTINGS = 'update:own:settings',

  // Admin permissions
  READ_ALL_USERS = 'read:all:users',
  UPDATE_ALL_USERS = 'update:all:users',
  DELETE_ALL_USERS = 'delete:all:users',
  SUSPEND_USERS = 'suspend:users',
  READ_ALL_TWEETS = 'read:all:tweets',
  UPDATE_ALL_TWEETS = 'update:all:tweets',
  DELETE_ALL_TWEETS = 'delete:all:tweets',
  REPROCESS_TWEETS = 'reprocess:tweets',
  READ_ALL_JOBS = 'read:all:jobs',
  RETRY_JOBS = 'retry:jobs',
  READ_SYSTEM_ANALYTICS = 'read:system:analytics',
  UPDATE_SYSTEM_SETTINGS = 'update:system:settings',
  MANAGE_CATEGORIES = 'manage:categories',
}

export const ROLE_PERMISSIONS = {
  user: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.DELETE_OWN_ACCOUNT,
    Permission.READ_OWN_TWEETS,
    Permission.DELETE_OWN_TWEETS,
    Permission.READ_OWN_ANALYTICS,
    Permission.UPDATE_OWN_SETTINGS,
  ],
  admin: Object.values(Permission), // Admin has all permissions
};
