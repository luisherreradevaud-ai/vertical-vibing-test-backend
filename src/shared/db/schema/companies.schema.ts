import type { Company, CompanyMember, CompanyStatus, CompanyRole } from '@vertical-vibing/shared-types';

/**
 * Company Database Schema
 */
export interface CompanyDB extends Omit<Company, 'createdAt' | 'updatedAt'> {
  created_at: Date;
  updated_at: Date;
}

/**
 * Company Member Database Schema
 */
export interface CompanyMemberDB extends Omit<CompanyMember, 'companyId' | 'userId' | 'joinedAt'> {
  company_id: string;
  user_id: string;
  joined_at: Date;
}

/**
 * Convert database company to domain company
 */
export function toCompany(dbCompany: CompanyDB): Company {
  return {
    id: dbCompany.id,
    name: dbCompany.name,
    slug: dbCompany.slug,
    status: dbCompany.status as CompanyStatus,
    createdAt: new Date(dbCompany.created_at),
    updatedAt: new Date(dbCompany.updated_at),
  };
}

/**
 * Convert database company member to domain company member
 */
export function toCompanyMember(dbMember: CompanyMemberDB): CompanyMember {
  return {
    id: dbMember.id,
    companyId: dbMember.company_id,
    userId: dbMember.user_id,
    role: dbMember.role as CompanyRole,
    joinedAt: new Date(dbMember.joined_at),
  };
}
