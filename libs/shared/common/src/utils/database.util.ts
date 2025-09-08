import { Repository, SelectQueryBuilder, FindOptionsWhere } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

/**
 * Common database utilities for consistent database operations across microservices
 */
export class DatabaseUtil {
  /**
   * Apply pagination to query builder
   */
  static applyPagination<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number,
    limit: number
  ): SelectQueryBuilder<T> {
    const offset = (page - 1) * limit;
    return queryBuilder.skip(offset).take(limit);
  }

  /**
   * Apply sorting to query builder
   */
  static applySorting<T>(
    queryBuilder: SelectQueryBuilder<T>,
    sortBy: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    allowedSortFields: string[] = []
  ): SelectQueryBuilder<T> {
    if (allowedSortFields.length > 0 && !allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(`Invalid sort field. Allowed fields: ${allowedSortFields.join(', ')}`);
    }

    return queryBuilder.orderBy(`entity.${sortBy}`, sortOrder);
  }

  /**
   * Apply search filters to query builder
   */
  static applySearch<T>(
    queryBuilder: SelectQueryBuilder<T>,
    searchTerm: string,
    searchFields: string[]
  ): SelectQueryBuilder<T> {
    if (!searchTerm || searchFields.length === 0) {
      return queryBuilder;
    }

    const conditions = searchFields
      .map((field, index) => `entity.${field} ILIKE :searchTerm${index}`)
      .join(' OR ');

    const parameters = searchFields.reduce((params, field, index) => {
      params[`searchTerm${index}`] = `%${searchTerm}%`;
      return params;
    }, {} as Record<string, any>);

    return queryBuilder.andWhere(`(${conditions})`, parameters);
  }

  /**
   * Apply date range filter
   */
  static applyDateRange<T>(
    queryBuilder: SelectQueryBuilder<T>,
    dateField: string,
    startDate?: Date,
    endDate?: Date
  ): SelectQueryBuilder<T> {
    if (startDate) {
      queryBuilder.andWhere(`entity.${dateField} >= :startDate`, { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere(`entity.${dateField} <= :endDate`, { endDate });
    }

    return queryBuilder;
  }

  /**
   * Apply status filter
   */
  static applyStatusFilter<T>(
    queryBuilder: SelectQueryBuilder<T>,
    statusField: string,
    status?: string | string[]
  ): SelectQueryBuilder<T> {
    if (!status) {
      return queryBuilder;
    }

    if (Array.isArray(status)) {
      queryBuilder.andWhere(`entity.${statusField} IN (:...statuses)`, { statuses: status });
    } else {
      queryBuilder.andWhere(`entity.${statusField} = :status`, { status });
    }

    return queryBuilder;
  }

  /**
   * Get paginated results with metadata
   */
  static async getPaginatedResults<T>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number,
    limit: number
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Soft delete utility
   */
  static async softDelete<T>(
    repository: Repository<T>,
    id: string,
    deletedBy?: string
  ): Promise<void> {
    const updateData: any = {
      deletedAt: new Date(),
      ...(deletedBy && { deletedBy }),
    };

    await repository.update(id as any, updateData);
  }

  /**
   * Bulk update utility
   */
  static async bulkUpdate<T>(
    repository: Repository<T>,
    criteria: FindOptionsWhere<T>,
    updateData: Partial<T>
  ): Promise<void> {
    await repository.update(criteria, updateData as any);
  }

  /**
   * Find with relations helper
   */
  static async findWithRelations<T>(
    repository: Repository<T>,
    id: string,
    relations: string[]
  ): Promise<T | null> {
    return repository.findOne({
      where: { id } as any,
      relations,
    });
  }

  /**
   * Check if entity exists
   */
  static async exists<T>(
    repository: Repository<T>,
    criteria: FindOptionsWhere<T>
  ): Promise<boolean> {
    const count = await repository.count({ where: criteria });
    return count > 0;
  }

  /**
   * Count entities with filters
   */
  static async countWithFilters<T>(
    repository: Repository<T>,
    filters: FindOptionsWhere<T>
  ): Promise<number> {
    return repository.count({ where: filters });
  }

  /**
   * Find or create entity
   */
  static async findOrCreate<T>(
    repository: Repository<T>,
    criteria: FindOptionsWhere<T>,
    createData: Partial<T>
  ): Promise<{ entity: T; created: boolean }> {
    let entity = await repository.findOne({ where: criteria });
    
    if (!entity) {
      const newEntity = repository.create(createData as any);
      const savedEntity = await repository.save(newEntity);
      return { entity: savedEntity as T, created: true };
    }

    return { entity, created: false };
  }

  /**
   * Transaction wrapper
   */
  static async withTransaction<T>(
    repository: Repository<any>,
    operation: (manager: any) => Promise<T>
  ): Promise<T> {
    return repository.manager.transaction(operation);
  }

  /**
   * Build dynamic query
   */
  static buildDynamicQuery<T>(
    repository: Repository<T>,
    filters: Record<string, any>,
    allowedFilters: string[] = []
  ): SelectQueryBuilder<T> {
    const queryBuilder = repository.createQueryBuilder('entity');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (allowedFilters.length === 0 || allowedFilters.includes(key)) {
          if (typeof value === 'string') {
            queryBuilder.andWhere(`entity.${key} ILIKE :${key}`, { [key]: `%${value}%` });
          } else {
            queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: value });
          }
        }
      }
    });

    return queryBuilder;
  }

  /**
   * Get entity statistics
   */
  static async getEntityStats<T>(
    repository: Repository<T>,
    groupByField: string,
    dateField?: string
  ): Promise<Array<{ group: string; count: number; percentage: number }>> {
    const queryBuilder = repository
      .createQueryBuilder('entity')
      .select(`entity.${groupByField}`, 'group')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`entity.${groupByField}`);

    if (dateField) {
      queryBuilder.andWhere(`entity.${dateField} >= :startOfMonth`, {
        startOfMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      });
    }

    const results = await queryBuilder.getRawMany();
    const total = results.reduce((sum, item) => sum + parseInt(item.count), 0);

    return results.map(item => ({
      group: item.group,
      count: parseInt(item.count),
      percentage: total > 0 ? Math.round((parseInt(item.count) / total) * 100) : 0,
    }));
  }
}