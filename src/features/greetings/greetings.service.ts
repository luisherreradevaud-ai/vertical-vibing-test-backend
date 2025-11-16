import type { Greeting } from './greetings.types';

/**
 * Greetings Service
 *
 * Business logic for managing greetings
 */
export class GreetingsService {
  /**
   * Get all greetings
   *
   * Returns a collection of greetings in different languages
   */
  async getGreetings(): Promise<Greeting[]> {
    // Hardcoded greetings for demo purposes
    const greetings: Greeting[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        message: 'Hello, World!',
        language: 'en',
        createdAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        message: 'Hola, Mundo!',
        language: 'es',
        createdAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        message: 'Bonjour, Monde!',
        language: 'fr',
        createdAt: new Date().toISOString(),
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        message: 'Hallo, Welt!',
        language: 'de',
        createdAt: new Date().toISOString(),
      },
    ];

    return greetings;
  }
}
