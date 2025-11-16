import type { Company, CompanyMember, CompanyRole, CompanyStatus } from '@vertical-vibing/shared-types';
import type { Database } from '../client';

export class CompaniesRepository {
  constructor(private db: Database) {}

  async create(data: { id: string; name: string; slug: string }): Promise<Company> {
    const company: Company = {
      ...data,
      status: 'active' as CompanyStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.companies.create(company);
    return company;
  }

  async findById(id: string): Promise<Company | null> {
    return this.db.companies.findById(id);
  }

  async findBySlug(slug: string): Promise<Company | null> {
    return this.db.companies.findBySlug(slug);
  }

  async findByUserId(userId: string): Promise<Company[]> {
    return this.db.companies.findByUserId(userId);
  }

  async update(id: string, data: Partial<Pick<Company, 'name' | 'slug'>>): Promise<Company | null> {
    return this.db.companies.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.db.companies.delete(id);
  }

  // Company Members
  async addMember(data: { id: string; companyId: string; userId: string; role: CompanyRole }): Promise<CompanyMember> {
    const member: CompanyMember = {
      ...data,
      joinedAt: new Date(),
    };

    await this.db.companyMembers.create(member);
    return member;
  }

  async getMember(companyId: string, userId: string): Promise<CompanyMember | null> {
    return this.db.companyMembers.findByCompanyAndUser(companyId, userId);
  }

  async getMembers(companyId: string): Promise<CompanyMember[]> {
    return this.db.companyMembers.findByCompanyId(companyId);
  }

  async updateMemberRole(companyId: string, userId: string, role: CompanyRole): Promise<CompanyMember | null> {
    return this.db.companyMembers.updateRole(companyId, userId, role);
  }

  async removeMember(companyId: string, userId: string): Promise<boolean> {
    return this.db.companyMembers.delete(companyId, userId);
  }
}
