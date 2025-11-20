import type {
  AuthProvider,
  AuthProviderResult,
  TokenValidationResult,
  LoginCredentials,
  RegisterData,
  PasswordResetResult,
  EmailVerificationResult,
} from '@vertical-vibing/shared-types';

/**
 * Auth Provider Interface
 *
 * All authentication providers must implement this interface
 * Supports: in-house JWT, AWS Cognito, Clerk
 */
export interface IAuthProvider {
  /**
   * Provider name
   */
  readonly name: AuthProvider;

  /**
   * Login with email and password
   *
   * @param credentials - User credentials
   * @returns Auth result with user data
   * @throws AuthProviderError if login fails
   */
  login(credentials: LoginCredentials): Promise<AuthProviderResult>;

  /**
   * Register a new user
   *
   * @param data - Registration data
   * @returns Auth result with user data
   * @throws AuthProviderError if registration fails
   */
  register(data: RegisterData): Promise<AuthProviderResult>;

  /**
   * Validate a token (JWT for in-house, provider token for external)
   *
   * @param token - Token to validate
   * @returns Validation result with user data if valid
   */
  validateToken(token: string): Promise<TokenValidationResult>;

  /**
   * Refresh access token
   *
   * @param refreshToken - Refresh token
   * @returns New auth result with refreshed tokens
   * @throws AuthProviderError if refresh fails
   */
  refreshToken(refreshToken: string): Promise<AuthProviderResult>;

  /**
   * Initiate password reset
   *
   * @param email - User email
   * @returns Result indicating if reset email was sent
   */
  resetPassword(email: string): Promise<PasswordResetResult>;

  /**
   * Verify email with token
   *
   * @param token - Verification token
   * @returns Result with user ID if successful
   * @throws AuthProviderError if verification fails
   */
  verifyEmail(token: string): Promise<EmailVerificationResult>;

  /**
   * Update user password
   *
   * @param userId - Internal user ID
   * @param currentPassword - Current password (for verification)
   * @param newPassword - New password
   * @throws AuthProviderError if update fails
   */
  updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
}

/**
 * Auth Provider Error
 *
 * Thrown when a provider operation fails
 */
export class AuthProviderError extends Error {
  constructor(
    message: string,
    public provider: AuthProvider,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AuthProviderError';
  }
}
