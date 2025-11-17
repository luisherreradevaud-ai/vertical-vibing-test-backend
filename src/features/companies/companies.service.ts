import { db } from '../../shared/db/client';
import { CompaniesRepository } from '../../shared/db/repositories/companies.repository';
import { CompanyRole } from '@vertical-vibing/shared-types';
import type { Company, CompanyMember, CompanyWithMembers } from '@vertical-vibing/shared-types';

export class CompaniesService {
  private companiesRepo: CompaniesRepository;

  constructor() {
    this.companiesRepo = new CompaniesRepository(db);
  }

  /**
   * Create a new company
   */
  async createCompany(data: {
    name: string;
    slug: string;
    ownerId: string;
  }): Promise<Company> {
    // Check if slug is already taken
    const existing = await this.companiesRepo.findBySlug(data.slug);
    if (existing) {
      throw new Error('Company slug already exists');
    }

    // Create company
    const companyId = crypto.randomUUID();
    const company = await this.companiesRepo.create({
      id: companyId,
      name: data.name,
      slug: data.slug,
    });

    // Add creator as owner
    await this.companiesRepo.addMember({
      id: crypto.randomUUID(),
      companyId: company.id,
      userId: data.ownerId,
      role: CompanyRole.OWNER,
    });

    return company;
  }

  /**
   * Get company by ID
   */
  async getCompanyById(id: string): Promise<Company | null> {
    return this.companiesRepo.findById(id);
  }

  /**
   * Get company with members
   */
  async getCompanyWithMembers(id: string): Promise<CompanyWithMembers | null> {
    const company = await this.companiesRepo.findById(id);
    if (!company) return null;

    const members = await this.companiesRepo.getMembers(id);

    // Get user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await db.users.findById(member.userId);
        return {
          ...member,
          user: {
            id: user?.id || '',
            email: user?.email || '',
            name: user?.name || null,
          },
        };
      })
    );

    return {
      ...company,
      members: membersWithUsers,
    };
  }

  /**
   * Get companies for a user
   */
  async getUserCompanies(userId: string): Promise<Company[]> {
    return this.companiesRepo.findByUserId(userId);
  }

  /**
   * Update company
   */
  async updateCompany(
    id: string,
    userId: string,
    data: Partial<Pick<Company, 'name' | 'slug'>>
  ): Promise<Company> {
    // Check user has permission (must be owner or admin)
    const member = await this.companiesRepo.getMember(id, userId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new Error('Insufficient permissions');
    }

    // Check slug availability if changing
    if (data.slug) {
      const existing = await this.companiesRepo.findBySlug(data.slug);
      if (existing && existing.id !== id) {
        throw new Error('Company slug already exists');
      }
    }

    const updated = await this.companiesRepo.update(id, data);
    if (!updated) {
      throw new Error('Company not found');
    }

    return updated;
  }

  /**
   * Delete company (owner only)
   */
  async deleteCompany(id: string, userId: string): Promise<void> {
    const member = await this.companiesRepo.getMember(id, userId);
    if (!member || member.role !== 'owner') {
      throw new Error('Only company owner can delete the company');
    }

    const deleted = await this.companiesRepo.delete(id);
    if (!deleted) {
      throw new Error('Company not found');
    }
  }

  /**
   * Add member to company
   */
  async addMember(
    companyId: string,
    userId: string,
    data: { email: string; role: CompanyRole }
  ): Promise<CompanyMember> {
    // Check user has permission (must be owner or admin)
    const requester = await this.companiesRepo.getMember(companyId, userId);
    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      throw new Error('Insufficient permissions');
    }

    // Find user by email
    const targetUser = await db.users.findByEmail(data.email);
    if (!targetUser) {
      throw new Error('User not found');
    }

    // Check if already a member
    const existing = await this.companiesRepo.getMember(companyId, targetUser.id);
    if (existing) {
      throw new Error('User is already a member of this company');
    }

    // Add member
    return this.companiesRepo.addMember({
      id: crypto.randomUUID(),
      companyId,
      userId: targetUser.id,
      role: data.role,
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    companyId: string,
    requesterId: string,
    targetUserId: string,
    role: CompanyRole
  ): Promise<CompanyMember> {
    // Check requester has permission (must be owner or admin)
    const requester = await this.companiesRepo.getMember(companyId, requesterId);
    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      throw new Error('Insufficient permissions');
    }

    // Cannot change owner role (only one owner)
    const targetMember = await this.companiesRepo.getMember(companyId, targetUserId);
    if (targetMember?.role === 'owner' && role !== 'owner') {
      throw new Error('Cannot change owner role');
    }

    // Only owner can assign owner role
    if (role === 'owner' && requester.role !== 'owner') {
      throw new Error('Only owner can assign owner role');
    }

    const updated = await this.companiesRepo.updateMemberRole(companyId, targetUserId, role);
    if (!updated) {
      throw new Error('Member not found');
    }

    return updated;
  }

  /**
   * Remove member from company
   */
  async removeMember(
    companyId: string,
    requesterId: string,
    targetUserId: string
  ): Promise<void> {
    // Check requester has permission
    const requester = await this.companiesRepo.getMember(companyId, requesterId);
    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      throw new Error('Insufficient permissions');
    }

    // Cannot remove owner
    const targetMember = await this.companiesRepo.getMember(companyId, targetUserId);
    if (targetMember?.role === 'owner') {
      throw new Error('Cannot remove company owner');
    }

    const removed = await this.companiesRepo.removeMember(companyId, targetUserId);
    if (!removed) {
      throw new Error('Member not found');
    }
  }

  /**
   * Get company members
   */
  async getMembers(companyId: string, userId: string): Promise<Array<CompanyMember & {
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }>> {
    // Check user is a member
    const member = await this.companiesRepo.getMember(companyId, userId);
    if (!member) {
      throw new Error('Not a member of this company');
    }

    const members = await this.companiesRepo.getMembers(companyId);

    // Get user details for each member
    return Promise.all(
      members.map(async (member) => {
        const user = await db.users.findById(member.userId);
        return {
          ...member,
          user: {
            id: user?.id || '',
            email: user?.email || '',
            name: user?.name || null,
          },
        };
      })
    );
  }
}
