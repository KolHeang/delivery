import { Repository, FindManyOptions, SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export interface PaginationQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  result: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function paginateRepo<T extends ObjectLiteral>(
  repo: Repository<T>,
  options: PaginationQueryDto,
  findOptions: FindManyOptions<T> = {},
): Promise<PaginatedResult<T> | T[]> {
  const page = options.page !== undefined ? Math.max(1, Number(options.page)) : undefined;
  const limit = options.limit !== undefined ? Math.max(1, Number(options.limit)) : 10;

  if (page === undefined) {
    return repo.find(findOptions);
  }

  const [result, total] = await repo.findAndCount({
    ...findOptions,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    result,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function paginateQuery<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  options: PaginationQueryDto,
): Promise<PaginatedResult<T> | T[]> {
  const page = options.page !== undefined ? Math.max(1, Number(options.page)) : undefined;
  const limit = options.limit !== undefined ? Math.max(1, Number(options.limit)) : 10;

  if (page === undefined) {
    return queryBuilder.getMany();
  }

  const [result, total] = await queryBuilder
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return {
    result,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

