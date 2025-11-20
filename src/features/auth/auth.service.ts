import type { PublicUser, AuthProvider } from '@vertical-vibing/shared-types';
import type { RegisterDTO, LoginDTO, AuthResponse } from './auth.types';
import type { User } from '../../shared/db/schema/users.schema';
import { db } from '../../shared/db/client';
import { UsersRepository } from '../../shared/db/repositories/users.repository';
import { generateToken } from '../../shared/utils/jwt';
import { AuthProviderFactory } from './providers/auth-provider.factory';
import { AuthProviderError } from './providers/auth-provider.interface';

/**
 * Authentication Service
 *
 * Business logic for user authentication and registration
 * Uses provider pattern to support multiple auth providers (in-house, Cognito, Clerk)
 */
export class AuthService {
  private usersRepo: UsersRepository;
  private authProvider;

  constructor() {
    this.usersRepo = new UsersRepository(db);
    this.authProvider = AuthProviderFactory.create();
  }

  /**
   * Register a new user
   *
   * @param dto - Registration data
   * @returns User object and JWT token
   * @throws Error if email already exists or registration fails
   */
  async register(dto: RegisterDTO): Promise<AuthResponse['data']> {
    try {
      // Delegate to auth provider
      const authResult = await this.authProvider.register({
        email: dto.email,
        password: dto.password,
        name: dto.name,
      });

      // Sync user to our database (provider may have already created it)
      const user = await this.syncUserToDatabase(authResult);

      // Generate our JWT token (includes authProvider)
      const token = generateToken({
        userId: user.id,
        email: user.email,
        authProvider: user.authProvider as AuthProvider,
      });

      // Convert to public user
      const publicUser = this.toPublicUser(user);

      return {
        user: publicUser,
        token,
      };
    } catch (error) {
      if (error instanceof AuthProviderError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  /**
   * Login with email and password
   *
   * @param dto - Login credentials
   * @returns User object and JWT token
   * @throws Error if credentials are invalid
   */
  async login(dto: LoginDTO): Promise<AuthResponse['data']> {
    try {
      // Delegate to auth provider
      const authResult = await this.authProvider.login({
        email: dto.email,
        password: dto.password,
      });

      // Sync user to our database (get latest data)
      const user = await this.syncUserToDatabase(authResult);

      // Generate our JWT token (includes authProvider)
      const token = generateToken({
        userId: user.id,
        email: user.email,
        authProvider: user.authProvider as AuthProvider,
      });

      // Convert to public user
      const publicUser = this.toPublicUser(user);

      return {
        user: publicUser,
        token,
      };
    } catch (error) {
      if (error instanceof AuthProviderError) {
        // Return specific error for authentication service unavailable
        if (error.code === 'ERR_AUTH_SERVICE_UNAVAILABLE') {
          throw new Error('Authentication service temporarily unavailable');
        }
        throw new Error(error.message);
      }
      throw error;
    }
  }

  /**
   * Sync user data to our database
   *
   * Ensures all users (regardless of auth provider) exist in our database
   * This is critical for IAM, subscriptions, and other features
   *
   * @param authResult - Result from auth provider
   * @returns User from our database
   */
  private async syncUserToDatabase(authResult: {
    userId: string;
    email: string;
    name: string;
    externalId?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<User> {
    // User already exists (in-house provider creates in DB)
    const existingUser = await this.usersRepo.findById(authResult.userId);
    if (existingUser) {
      return existingUser;
    }

    // For external providers, create user in our DB if doesn't exist
    // This shouldn't normally happen as providers should create the user
    // but it's a safety net
    throw new Error('User sync failed - user not found in database');
  }

  /**
   * Convert DB User to PublicUser (exclude sensitive data)
   *
   * @param user - Database user object
   * @returns Public user object without sensitive data
   */
  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl || null,
      authProvider: user.authProvider as AuthProvider,
      externalId: user.externalId || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
