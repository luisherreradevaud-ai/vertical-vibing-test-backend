import type { UsersRepository } from '../../shared/db/repositories/users.repository';
import type { UpdateProfileDto, ChangePasswordDto } from '@vertical-vibing/shared-types';
import type { User, PublicUser } from '@vertical-vibing/shared-types';
import { hashPassword, verifyPassword } from '../../shared/utils/password';

/**
 * Users Service
 *
 * Business logic for user profile operations
 */
export class UsersService {
  constructor(private usersRepository: UsersRepository) {}

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<PublicUser | null> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      return null;
    }
    return this.toPublicUser(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser | null> {
    // Check if email is being changed and if it's already taken
    if (dto.email) {
      const existingUser = await this.usersRepository.findByEmail(dto.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Email already in use');
      }
    }

    const updatedUser = await this.usersRepository.update(userId, {
      ...dto,
      updatedAt: new Date(),
    });

    if (!updatedUser) {
      return null;
    }

    return this.toPublicUser(updatedUser);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<boolean> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await verifyPassword(dto.currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(dto.newPassword);

    // Update password
    const updated = await this.usersRepository.update(userId, {
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    });

    return updated !== null;
  }

  /**
   * Convert User to PublicUser (remove sensitive data)
   */
  private toPublicUser(user: User): PublicUser {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
