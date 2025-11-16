/**
 * Database Client
 *
 * In-memory database for demonstration purposes.
 * In production, this would be a real PostgreSQL connection using Drizzle ORM.
 *
 * To connect to real Postgres:
 * 1. Set DATABASE_URL in .env
 * 2. Replace InMemoryDatabase with drizzle(postgres(DATABASE_URL))
 * 3. Run migrations
 */

import type { User, NewUser } from './schema/users.schema';
import type { Subscription, NewSubscription } from './schema/subscriptions.schema';
import type { Company, CompanyMember, CompanyRole } from '@vertical-vibing/shared-types';

export interface Database {
  users: {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(user: NewUser): Promise<User>;
    update(id: string, data: Partial<NewUser>): Promise<User | null>;
    delete(id: string): Promise<boolean>;
  };
  subscriptions: {
    findByUserId(userId: string): Promise<Subscription | null>;
    findById(id: string): Promise<Subscription | null>;
    findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | null>;
    create(subscription: NewSubscription): Promise<Subscription>;
    update(id: string, data: Partial<NewSubscription>): Promise<Subscription | null>;
    delete(id: string): Promise<boolean>;
  };
  companies: {
    findById(id: string): Promise<Company | null>;
    findBySlug(slug: string): Promise<Company | null>;
    findByUserId(userId: string): Promise<Company[]>;
    create(company: Company): Promise<Company>;
    update(id: string, data: Partial<Pick<Company, 'name' | 'slug'>>): Promise<Company | null>;
    delete(id: string): Promise<boolean>;
  };
  companyMembers: {
    findByCompanyId(companyId: string): Promise<CompanyMember[]>;
    findByCompanyAndUser(companyId: string, userId: string): Promise<CompanyMember | null>;
    create(member: CompanyMember): Promise<CompanyMember>;
    updateRole(companyId: string, userId: string, role: CompanyRole): Promise<CompanyMember | null>;
    delete(companyId: string, userId: string): Promise<boolean>;
  };
}

/**
 * In-Memory Database Implementation
 *
 * Simple in-memory storage for demo purposes
 */
class InMemoryDatabase implements Database {
  private usersStore: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> id
  private subscriptionsStore: Map<string, Subscription> = new Map();
  private userSubscriptionIndex: Map<string, string> = new Map(); // userId -> subscriptionId
  private stripeSubscriptionIndex: Map<string, string> = new Map(); // stripeSubscriptionId -> subscriptionId
  private companiesStore: Map<string, Company> = new Map();
  private companySlugIndex: Map<string, string> = new Map(); // slug -> companyId
  private companyMembersStore: Map<string, CompanyMember> = new Map(); // `${companyId}:${userId}` -> member
  private userCompaniesIndex: Map<string, Set<string>> = new Map(); // userId -> Set<companyId>

  users = {
    findByEmail: async (email: string): Promise<User | null> => {
      const userId = this.emailIndex.get(email.toLowerCase());
      if (!userId) return null;
      return this.usersStore.get(userId) || null;
    },

    findById: async (id: string): Promise<User | null> => {
      return this.usersStore.get(id) || null;
    },

    create: async (userData: NewUser): Promise<User> => {
      const id = userData.id || crypto.randomUUID();
      const now = new Date();

      const user: User = {
        id,
        email: userData.email,
        passwordHash: userData.passwordHash,
        name: userData.name,
        avatarUrl: userData.avatarUrl || null,
        emailVerified: userData.emailVerified || false,
        createdAt: userData.createdAt || now,
        updatedAt: userData.updatedAt || now,
      };

      this.usersStore.set(id, user);
      this.emailIndex.set(user.email.toLowerCase(), id);

      return user;
    },

    update: async (id: string, data: Partial<NewUser>): Promise<User | null> => {
      const existing = this.usersStore.get(id);
      if (!existing) return null;

      // Update email index if email changed
      if (data.email && data.email !== existing.email) {
        this.emailIndex.delete(existing.email.toLowerCase());
        this.emailIndex.set(data.email.toLowerCase(), id);
      }

      const updated: User = {
        ...existing,
        ...data,
        id, // Keep original ID
        updatedAt: new Date(),
      };

      this.usersStore.set(id, updated);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      const user = this.usersStore.get(id);
      if (!user) return false;

      this.emailIndex.delete(user.email.toLowerCase());
      this.usersStore.delete(id);
      return true;
    },
  };

  subscriptions = {
    findByUserId: async (userId: string): Promise<Subscription | null> => {
      const subscriptionId = this.userSubscriptionIndex.get(userId);
      if (!subscriptionId) return null;
      return this.subscriptionsStore.get(subscriptionId) || null;
    },

    findById: async (id: string): Promise<Subscription | null> => {
      return this.subscriptionsStore.get(id) || null;
    },

    findByStripeSubscriptionId: async (stripeSubscriptionId: string): Promise<Subscription | null> => {
      const subscriptionId = this.stripeSubscriptionIndex.get(stripeSubscriptionId);
      if (!subscriptionId) return null;
      return this.subscriptionsStore.get(subscriptionId) || null;
    },

    create: async (subscriptionData: NewSubscription): Promise<Subscription> => {
      const id = subscriptionData.id || crypto.randomUUID();
      const now = new Date();

      const subscription: Subscription = {
        id,
        userId: subscriptionData.userId,
        planTier: subscriptionData.planTier,
        status: subscriptionData.status,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
        stripeCustomerId: subscriptionData.stripeCustomerId || null,
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId || null,
        createdAt: subscriptionData.createdAt || now,
        updatedAt: subscriptionData.updatedAt || now,
      };

      this.subscriptionsStore.set(id, subscription);
      this.userSubscriptionIndex.set(subscription.userId, id);
      if (subscription.stripeSubscriptionId) {
        this.stripeSubscriptionIndex.set(subscription.stripeSubscriptionId, id);
      }

      return subscription;
    },

    update: async (id: string, data: Partial<NewSubscription>): Promise<Subscription | null> => {
      const existing = this.subscriptionsStore.get(id);
      if (!existing) return null;

      // Update stripe subscription index if it changed
      if (data.stripeSubscriptionId && data.stripeSubscriptionId !== existing.stripeSubscriptionId) {
        if (existing.stripeSubscriptionId) {
          this.stripeSubscriptionIndex.delete(existing.stripeSubscriptionId);
        }
        this.stripeSubscriptionIndex.set(data.stripeSubscriptionId, id);
      }

      const updated: Subscription = {
        ...existing,
        ...data,
        id, // Keep original ID
        updatedAt: new Date(),
      };

      this.subscriptionsStore.set(id, updated);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      const subscription = this.subscriptionsStore.get(id);
      if (!subscription) return false;

      this.userSubscriptionIndex.delete(subscription.userId);
      if (subscription.stripeSubscriptionId) {
        this.stripeSubscriptionIndex.delete(subscription.stripeSubscriptionId);
      }
      this.subscriptionsStore.delete(id);
      return true;
    },
  };

  companies = {
    findById: async (id: string): Promise<Company | null> => {
      return this.companiesStore.get(id) || null;
    },

    findBySlug: async (slug: string): Promise<Company | null> => {
      const companyId = this.companySlugIndex.get(slug.toLowerCase());
      if (!companyId) return null;
      return this.companiesStore.get(companyId) || null;
    },

    findByUserId: async (userId: string): Promise<Company[]> => {
      const companyIds = this.userCompaniesIndex.get(userId);
      if (!companyIds) return [];
      return Array.from(companyIds)
        .map(id => this.companiesStore.get(id))
        .filter((c): c is Company => c !== undefined);
    },

    create: async (company: Company): Promise<Company> => {
      this.companiesStore.set(company.id, company);
      this.companySlugIndex.set(company.slug.toLowerCase(), company.id);
      return company;
    },

    update: async (id: string, data: Partial<Pick<Company, 'name' | 'slug'>>): Promise<Company | null> => {
      const existing = this.companiesStore.get(id);
      if (!existing) return null;

      if (data.slug && data.slug !== existing.slug) {
        this.companySlugIndex.delete(existing.slug.toLowerCase());
        this.companySlugIndex.set(data.slug.toLowerCase(), id);
      }

      const updated: Company = {
        ...existing,
        ...data,
        id,
        updatedAt: new Date(),
      };

      this.companiesStore.set(id, updated);
      return updated;
    },

    delete: async (id: string): Promise<boolean> => {
      const company = this.companiesStore.get(id);
      if (!company) return false;

      this.companySlugIndex.delete(company.slug.toLowerCase());
      this.companiesStore.delete(id);

      // Clean up member associations
      Array.from(this.companyMembersStore.keys())
        .filter(key => key.startsWith(`${id}:`))
        .forEach(key => this.companyMembersStore.delete(key));

      return true;
    },
  };

  companyMembers = {
    findByCompanyId: async (companyId: string): Promise<CompanyMember[]> => {
      return Array.from(this.companyMembersStore.entries())
        .filter(([key]) => key.startsWith(`${companyId}:`))
        .map(([, member]) => member);
    },

    findByCompanyAndUser: async (companyId: string, userId: string): Promise<CompanyMember | null> => {
      const key = `${companyId}:${userId}`;
      return this.companyMembersStore.get(key) || null;
    },

    create: async (member: CompanyMember): Promise<CompanyMember> => {
      const key = `${member.companyId}:${member.userId}`;
      this.companyMembersStore.set(key, member);

      const userCompanies = this.userCompaniesIndex.get(member.userId) || new Set();
      userCompanies.add(member.companyId);
      this.userCompaniesIndex.set(member.userId, userCompanies);

      return member;
    },

    updateRole: async (companyId: string, userId: string, role: CompanyRole): Promise<CompanyMember | null> => {
      const key = `${companyId}:${userId}`;
      const existing = this.companyMembersStore.get(key);
      if (!existing) return null;

      const updated: CompanyMember = {
        ...existing,
        role,
      };

      this.companyMembersStore.set(key, updated);
      return updated;
    },

    delete: async (companyId: string, userId: string): Promise<boolean> => {
      const key = `${companyId}:${userId}`;
      const member = this.companyMembersStore.get(key);
      if (!member) return false;

      this.companyMembersStore.delete(key);

      const userCompanies = this.userCompaniesIndex.get(userId);
      if (userCompanies) {
        userCompanies.delete(companyId);
        if (userCompanies.size === 0) {
          this.userCompaniesIndex.delete(userId);
        }
      }

      return true;
    },
  };
}

// Export singleton instance
export const db: Database = new InMemoryDatabase();
