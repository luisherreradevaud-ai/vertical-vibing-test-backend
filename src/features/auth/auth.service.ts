import type { PublicUser } from '@vertical-vibing/shared-types';
import type { RegisterDTO, LoginDTO, AuthResponse } from './auth.types';
import type { User } from '../../shared/db/schema/users.schema';
import { db } from '../../shared/db/client';
import { UsersRepository } from '../../shared/db/repositories/users.repository';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { generateToken } from '../../shared/utils/jwt';

/**
 * Authentication Service
 *
 * Business logic for user authentication and registration
 */
export class AuthService {
  private usersRepo: UsersRepository;

  constructor() {
    this.usersRepo = new UsersRepository(db);
  }

  /**
   * Register a new user
   *
   * @param dto - Registration data
   * @returns User object and JWT token
   * @throws Error if email already exists
   */
  async register(dto: RegisterDTO): Promise<AuthResponse['data']> {
    // Check if email already exists
    const existingUser = await this.usersRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(dto.password);

    // Create user
    const user = await this.usersRepo.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Convert to public user (exclude password_hash)
    const publicUser = this.toPublicUser(user);

    return {
      user: publicUser,
      token,
    };
  }

  /**
   * Login with email and password
   *
   * @param dto - Login credentials
   * @returns User object and JWT token
   * @throws Error if credentials are invalid
   */
  async login(dto: LoginDTO): Promise<AuthResponse['data']> {
    // Find user by email
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Convert to public user (exclude password_hash)
    const publicUser = this.toPublicUser(user);

    return {
      user: publicUser,
      token,
    };
  }

  /**
   * Convert DB User to PublicUser (exclude password_hash)
   *
   * @param user - Database user object
   * @returns Public user object without sensitive data
   */
  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
