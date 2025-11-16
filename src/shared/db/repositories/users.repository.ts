import type { Database } from '../client';
import type { User, NewUser } from '../schema/users.schema';

/**
 * Users Repository
 *
 * Data access layer for users table
 */
export class UsersRepository {
  constructor(private db: Database) {}

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.db.users.findByEmail(email);
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.db.users.findById(id);
  }

  /**
   * Create a new user
   */
  async create(userData: NewUser): Promise<User> {
    return this.db.users.create(userData);
  }

  /**
   * Update user by ID
   */
  async update(id: string, data: Partial<NewUser>): Promise<User | null> {
    return this.db.users.update(id, data);
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<boolean> {
    return this.db.users.delete(id);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }
}
