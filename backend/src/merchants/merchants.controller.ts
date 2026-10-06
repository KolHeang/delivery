import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto, UpdateMerchantDto } from './dto/merchant.dto';
import { CreateMerchantBranchDto, UpdateMerchantBranchDto } from './dto/merchant-branch.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from '../config/multer';
import { MinioService } from '../minio/minio.service';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly minioService: MinioService,
  ) { }

  @Get()
  @RequirePermissions('merchants.read')
  @ApiOperation({ summary: 'Get all merchants' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.merchantsService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    }, tenantId);
  }

  @Get('branches/all')
  @RequirePermissions('branches.read', 'merchants.read')
  @ApiOperation({ summary: 'Get all branches across all merchants' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'merchantId', required: false, type: Number })
  @ApiQuery({ name: 'zoneId', required: false, type: Number })
  getAllBranches(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('merchantId') merchantId?: string,
    @Query('zoneId') zoneId?: string,
    @Req() req?: any,
  ) {
    return this.merchantsService.findAllBranches({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      merchantId: merchantId ? +merchantId : undefined,
      zoneId: zoneId ? +zoneId : undefined,
    }, req?.user?.tenantId);
  }

  @Post('branches/new')
  @RequirePermissions('branches.create', 'merchants.update')
  @ApiOperation({ summary: 'Create a new branch specifying merchantId in body' })
  @LogActivity({ action: 'CREATE_BRANCH', entityName: 'MerchantBranch', description: 'Created new branch from general module' })
  createBranchGeneral(
    @Body() dto: CreateMerchantBranchDto,
    @Req() req?: any,
  ) {
    if (!dto.merchantId) {
      throw new Error('merchantId is required');
    }
    return this.merchantsService.createBranch(dto.merchantId, dto, req?.user?.tenantId);
  }

  @Get('branches/detail/:id')
  @RequirePermissions('branches.read', 'merchants.read')
  @ApiOperation({ summary: 'Get single branch by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Branch ID' })
  getBranchById(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.findBranchById(id);
  }

  @Put('branches/detail/:id')
  @RequirePermissions('branches.update', 'merchants.update')
  @ApiOperation({ summary: 'Update a branch by branch ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Branch ID' })
  @LogActivity({ action: 'UPDATE_BRANCH', entityName: 'MerchantBranch', description: 'Updated branch from general module' })
  async updateBranchById(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantBranchDto,
  ) {
    const branch = await this.merchantsService.findBranchById(id);
    return this.merchantsService.updateBranch(branch.merchantId, id, dto);
  }

  @Get(':id')
  @RequirePermissions('merchants.read')
  @ApiOperation({ summary: 'Get merchant by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.findOne(id);
  }

  @Post()
  @RequirePermissions('merchants.create')
  @ApiOperation({ summary: 'Create merchant' })
  @LogActivity({ action: 'CREATE_MERCHANT', entityName: 'Merchant', description: 'Created new merchant/shop' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'qrImageKhr', maxCount: 1 },
      { name: 'qrImageUsd', maxCount: 1 },
    ], createMulterOptions({
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 5 * 1024 * 1024
    }))
  )
  @ApiConsumes('multipart/form-data')
  async create(
    @Body() dto: CreateMerchantDto,
    @UploadedFiles() files: { photo?: any[], qrImageKhr?: any[], qrImageUsd?: any[] },
    @Req() req?: any,
  ) {
    if (req?.user?.tenantId) {
      (dto as any).tenantId = req.user.tenantId;
    }
    if (files?.photo?.[0]) {
      dto.photo = await this.minioService.uploadFile(files.photo[0], 'merchants');
    }
    if (files?.qrImageKhr?.[0]) {
      dto.qrImageKhr = await this.minioService.uploadFile(files.qrImageKhr[0], 'merchants');
    }
    if (files?.qrImageUsd?.[0]) {
      dto.qrImageUsd = await this.minioService.uploadFile(files.qrImageUsd[0], 'merchants');
    }
    return this.merchantsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('merchants.update')
  @ApiOperation({ summary: 'Update merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @LogActivity({ action: 'UPDATE_MERCHANT', entityName: 'Merchant', description: 'Updated merchant/shop details' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'qrImageKhr', maxCount: 1 },
      { name: 'qrImageUsd', maxCount: 1 },
    ], createMulterOptions({
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 5 * 1024 * 1024
    }))
  )
  @ApiConsumes('multipart/form-data')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantDto,
    @UploadedFiles() files: { photo?: any[], qrImageKhr?: any[], qrImageUsd?: any[] }
  ) {
    if (files?.photo?.[0]) {
      dto.photo = await this.minioService.uploadFile(files.photo[0], 'merchants');
    }
    if (files?.qrImageKhr?.[0]) {
      dto.qrImageKhr = await this.minioService.uploadFile(files.qrImageKhr[0], 'merchants');
    }
    if (files?.qrImageUsd?.[0]) {
      dto.qrImageUsd = await this.minioService.uploadFile(files.qrImageUsd[0], 'merchants');
    }
    return this.merchantsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('merchants.delete')
  @ApiOperation({ summary: 'Delete merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @LogActivity({ action: 'DELETE_MERCHANT', entityName: 'Merchant', description: 'Deleted merchant/shop' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.remove(id);
  }

  // --- Branch Endpoints ---

  @Get(':id/branches/next-code')
  @RequirePermissions('branches.read', 'merchants.read')
  @ApiOperation({ summary: 'Get next auto-generated branch code for a merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  getNextBranchCode(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.getNextBranchCode(id);
  }

  @Get(':id/branches')
  @RequirePermissions('branches.read', 'merchants.read')
  @ApiOperation({ summary: 'Get all branches of a merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  getBranches(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.findBranches(id);
  }

  @Post(':id/branches')
  @RequirePermissions('branches.create', 'merchants.update')
  @ApiOperation({ summary: 'Add a new branch to a merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @LogActivity({ action: 'CREATE_BRANCH', entityName: 'MerchantBranch', description: 'Added new merchant branch' })
  createBranch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMerchantBranchDto,
    @Req() req: any,
  ) {
    return this.merchantsService.createBranch(id, dto, req?.user?.tenantId);
  }

  @Put(':id/branches/:branchId')
  @RequirePermissions('branches.update', 'merchants.update')
  @ApiOperation({ summary: 'Update a merchant branch' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiParam({ name: 'branchId', type: Number, description: 'Branch ID' })
  @LogActivity({ action: 'UPDATE_BRANCH', entityName: 'MerchantBranch', description: 'Updated merchant branch' })
  updateBranch(
    @Param('id', ParseIntPipe) id: number,
    @Param('branchId', ParseIntPipe) branchId: number,
    @Body() dto: UpdateMerchantBranchDto,
  ) {
    return this.merchantsService.updateBranch(id, branchId, dto);
  }

  @Delete(':id/branches/:branchId')
  @RequirePermissions('branches.delete', 'merchants.delete', 'merchants.update')
  @ApiOperation({ summary: 'Delete a merchant branch' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiParam({ name: 'branchId', type: Number, description: 'Branch ID' })
  @LogActivity({ action: 'DELETE_BRANCH', entityName: 'MerchantBranch', description: 'Deleted merchant branch' })
  deleteBranch(
    @Param('id', ParseIntPipe) id: number,
    @Param('branchId', ParseIntPipe) branchId: number,
  ) {
    return this.merchantsService.deleteBranch(id, branchId);
  }

  @Patch(':id/branches/:branchId/default')
  @RequirePermissions('branches.update', 'merchants.update')
  @ApiOperation({ summary: 'Set branch as default for merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiParam({ name: 'branchId', type: Number, description: 'Branch ID' })
  setDefaultBranch(
    @Param('id', ParseIntPipe) id: number,
    @Param('branchId', ParseIntPipe) branchId: number,
  ) {
    return this.merchantsService.setDefaultBranch(id, branchId);
  }
}
