import type { IAuthProvider } from './auth-provider.interface';
import type { AuthProvider } from '@vertical-vibing/shared-types';
import { InhouseAuthProvider } from './inhouse/inhouse-auth.provider';

/**
 * Auth Provider Factory
 *
 * Creates the appropriate auth provider based on environment configuration
 */
export class AuthProviderFactory {
  private static instance: IAuthProvider | null = null;

  /**
   * Create or get the auth provider instance (singleton)
   *
   * @returns Auth provider instance
   * @throws Error if provider type is unknown
   */
  static create(): IAuthProvider {
    // Return cached instance if already created
    if (this.instance) {
      return this.instance;
    }

    const providerType = (process.env.AUTH_PROVIDER || 'inhouse') as AuthProvider;

    console.log(`🔐 Initializing auth provider: ${providerType}`);

    switch (providerType) {
      case 'inhouse': {
        this.instance = new InhouseAuthProvider();
        break;
      }

      case 'cognito': {
        // TODO: Implement Cognito provider
        throw new Error(
          'Cognito provider not yet implemented. Please use AUTH_PROVIDER=inhouse for now.'
        );
      }

      case 'clerk': {
        // TODO: Implement Clerk provider
        throw new Error(
          'Clerk provider not yet implemented. Please use AUTH_PROVIDER=inhouse for now.'
        );
      }

      default:
        throw new Error(
          `Unknown auth provider: ${providerType}. Valid options: inhouse, cognito, clerk`
        );
    }

    return this.instance;
  }

  /**
   * Reset the factory (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }

  /**
   * Get the current provider type from environment
   */
  static getProviderType(): AuthProvider {
    return (process.env.AUTH_PROVIDER || 'inhouse') as AuthProvider;
  }
}
