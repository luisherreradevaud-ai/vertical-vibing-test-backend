import type {
  AuthProviderResult,
  TokenValidationResult,
  LoginCredentials,
  RegisterData,
  PasswordResetResult,
  EmailVerificationResult,
} from '@vertical-vibing/shared-types';
import type { IAuthProvider } from '../auth-provider.interface';
import { AuthProviderError } from '../auth-provider.interface';
import { db } from '../../../../shared/db/client';
import { UsersRepository } from '../../../../shared/db/repositories/users.repository';
import { hashPassword, verifyPassword } from '../../../../shared/utils/password';
import { verifyToken as verifyJWT } from '../../../../shared/utils/jwt';

/**
 * In-House Authentication Provider
 *
 * Implements authentication using bcrypt password hashing and JWT tokens
 * stored in our own PostgreSQL database
 */
export class InhouseAuthProvider implements IAuthProvider {
  readonly name = 'inhouse' as const;
  private usersRepo: UsersRepository;

  constructor() {
    this.usersRepo = new UsersRepository(db);
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthProviderResult> {
    try {
      // Find user by email
      const user = await this.usersRepo.findByEmail(credentials.email);
      if (!user) {
        throw new AuthProviderError(
          'Invalid credentials',
          'inhouse',
          'ERR_AUTH_INVALID_CREDENTIALS'
        );
      }

      // Verify this is an in-house user
      if (user.authProvider !== 'inhouse') {
        throw new AuthProviderError(
          `This account uses ${user.authProvider} authentication`,
          'inhouse',
          'ERR_AUTH_WRONG_PROVIDER'
        );
      }

      // Verify password
      if (!user.passwordHash) {
        throw new AuthProviderError(
          'Account has no password set',
          'inhouse',
          'ERR_AUTH_NO_PASSWORD'
        );
      }

      const isValid = await verifyPassword(credentials.password, user.passwordHash);
      if (!isValid) {
        throw new AuthProviderError(
          'Invalid credentials',
          'inhouse',
          'ERR_AUTH_INVALID_CREDENTIALS'
        );
      }

      // Return auth result
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        externalId: null,
        metadata: null,
      };
    } catch (error) {
      if (error instanceof AuthProviderError) {
        throw error;
      }
      throw new AuthProviderError(
        'Login failed',
        'inhouse',
        'ERR_AUTH_LOGIN_FAILED',
        error as Error
      );
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthProviderResult> {
    try {
      // Check if email already exists
      const existingUser = await this.usersRepo.findByEmail(data.email);
      if (existingUser) {
        throw new AuthProviderError(
          'Email already registered',
          'inhouse',
          'ERR_AUTH_EMAIL_EXISTS'
        );
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await this.usersRepo.create({
        email: data.email,
        passwordHash,
        name: data.name,
        authProvider: 'inhouse',
        externalId: null,
        externalMetadata: null,
      });

      // Return auth result
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        externalId: null,
        metadata: null,
      };
    } catch (error) {
      if (error instanceof AuthProviderError) {
        throw error;
      }
      throw new AuthProviderError(
        'Registration failed',
        'inhouse',
        'ERR_AUTH_REGISTRATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Verify JWT
      const payload = verifyJWT(token);

      // Verify user exists
      const user = await this.usersRepo.findById(payload.userId);
      if (!user) {
        return {
          valid: false,
          error: 'User not found',
        };
      }

      // Verify provider matches
      if (user.authProvider !== 'inhouse') {
        return {
          valid: false,
          error: `Token is for ${user.authProvider} provider`,
        };
      }

      return {
        valid: true,
        userId: user.id,
        email: user.email,
        externalId: null,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }

  /**
   * Refresh token (in-house provider doesn't support refresh tokens yet)
   */
  async refreshToken(refreshToken: string): Promise<AuthProviderResult> {
    throw new AuthProviderError(
      'Refresh tokens not implemented for in-house provider',
      'inhouse',
      'ERR_AUTH_NOT_IMPLEMENTED'
    );
  }

  /**
   * Reset password (send reset email)
   */
  async resetPassword(email: string): Promise<PasswordResetResult> {
    try {
      const user = await this.usersRepo.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return {
          success: true,
          message: 'If the email exists, a reset link has been sent',
        };
      }

      if (user.authProvider !== 'inhouse') {
        return {
          success: false,
          message: `This account uses ${user.authProvider} authentication`,
        };
      }

      // TODO: Generate reset token and send email
      // For now, just return success
      console.log(`Password reset requested for user: ${user.id}`);

      return {
        success: true,
        message: 'If the email exists, a reset link has been sent',
      };
    } catch (error) {
      throw new AuthProviderError(
        'Password reset failed',
        'inhouse',
        'ERR_AUTH_RESET_FAILED',
        error as Error
      );
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<EmailVerificationResult> {
    try {
      // TODO: Implement email verification logic
      // For now, throw not implemented
      throw new AuthProviderError(
        'Email verification not implemented',
        'inhouse',
        'ERR_AUTH_NOT_IMPLEMENTED'
      );
    } catch (error) {
      if (error instanceof AuthProviderError) {
        throw error;
      }
      throw new AuthProviderError(
        'Email verification failed',
        'inhouse',
        'ERR_AUTH_VERIFICATION_FAILED',
        error as Error
      );
    }
  }

  /**
   * Update password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      // Get user
      const user = await this.usersRepo.findById(userId);
      if (!user) {
        throw new AuthProviderError(
          'User not found',
          'inhouse',
          'ERR_AUTH_USER_NOT_FOUND'
        );
      }

      // Verify provider
      if (user.authProvider !== 'inhouse') {
        throw new AuthProviderError(
          `Cannot update password for ${user.authProvider} user`,
          'inhouse',
          'ERR_AUTH_WRONG_PROVIDER'
        );
      }

      // Verify current password
      if (!user.passwordHash) {
        throw new AuthProviderError(
          'Account has no password set',
          'inhouse',
          'ERR_AUTH_NO_PASSWORD'
        );
      }

      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new AuthProviderError(
          'Current password is incorrect',
          'inhouse',
          'ERR_AUTH_INVALID_PASSWORD'
        );
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await this.usersRepo.update(userId, { passwordHash: newPasswordHash });
    } catch (error) {
      if (error instanceof AuthProviderError) {
        throw error;
      }
      throw new AuthProviderError(
        'Password update failed',
        'inhouse',
        'ERR_AUTH_UPDATE_FAILED',
        error as Error
      );
    }
  }
}
