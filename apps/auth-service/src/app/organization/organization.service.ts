import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '@edutech-lms/database';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async findById(id: string): Promise<Organization> {
    return this.organizationRepository.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Organization> {
    return this.organizationRepository.findOne({ where: { slug } });
  }

  async create(organizationData: Partial<Organization>): Promise<Organization> {
    const organization = this.organizationRepository.create(organizationData);
    return this.organizationRepository.save(organization);
  }

  async update(id: string, organizationData: Partial<Organization>): Promise<Organization> {
    await this.organizationRepository.update(id, organizationData);
    return this.findById(id);
  }
}