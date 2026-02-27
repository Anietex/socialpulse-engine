/**
 * User Mapper
 * Maps between User domain entity and UserDocument persistence model
 */

import { User, UserSettings } from '../../../domain/entities/User';
import { UserDocument } from '../schemas/UserSchema';

export class UserMapper {
  /**
   * Map from UserDocument to User domain entity
   */
  static toDomain(doc: UserDocument): User {
    const settings = new UserSettings(
      {
        enabled: doc.settings.automation.enabled,
        maxEngagementsPerDay: doc.settings.automation.maxEngagementsPerDay,
        targetCategories: [...doc.settings.automation.targetCategories],
      },
      {
        email: doc.settings.notifications.email,
        inApp: doc.settings.notifications.inApp,
      }
    );

    return User.builder()
      .id(doc._id.toString())
      .email(doc.email)
      .password(doc.password)
      .name(doc.name)
      .role(doc.role)
      .status(doc.status)
      .twitterHandle(doc.twitterHandle)
      .settings(settings)
      .createdAt(doc.createdAt)
      .updatedAt(doc.updatedAt)
      .build();
  }

  /**
   * Map from User domain entity to persistence object
   */
  static toPersistence(user: User): Partial<UserDocument> {
    return {
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
      status: user.status,
      twitterHandle: user.twitterHandle,
      settings: {
        automation: {
          enabled: user.settings.automation.enabled,
          maxEngagementsPerDay: user.settings.automation.maxEngagementsPerDay,
          targetCategories: [...user.settings.automation.targetCategories],
        },
        notifications: {
          email: user.settings.notifications.email,
          inApp: user.settings.notifications.inApp,
        },
      },
    };
  }
}
