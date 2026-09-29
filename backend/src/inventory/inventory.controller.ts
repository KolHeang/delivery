import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateProductDto,
  UpdateProductDto,
  AdjustStockDto,
} from './dto/product.dto';
import { ScanBarcodeDto, RestockParcelDto } from './dto/pick-pack.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ---------------- PRODUCTS ---------------- //

  @Get('products')
  @RequirePermissions('inventory.read')
  findAllProducts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('merchantId') merchantId?: number,
    @Query('category') category?: string,
    @Query('active') active?: boolean,
    @Query('lowStock') lowStock?: boolean,
  ) {
    return this.inventoryService.findAllProducts({
      page,
      limit,
      search,
      merchantId: merchantId ? Number(merchantId) : undefined,
      category,
      active: active !== undefined ? String(active) === 'true' : undefined,
      lowStock: lowStock !== undefined ? String(lowStock) === 'true' : undefined,
    });
  }

  @Get('products/:id')
  @RequirePermissions('inventory.read')
  findOneProduct(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.findOneProduct(id);
  }

  @Post('products')
  @RequirePermissions('inventory.create')
  createProduct(@Body() dto: CreateProductDto, @Request() req: any) {
    return this.inventoryService.createProduct(dto, req.user?.id);
  }

  @Patch('products/:id')
  @RequirePermissions('inventory.update')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('inventory.delete')
  removeProduct(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.removeProduct(id);
  }

  @Post('products/:id/adjust')
  @RequirePermissions('inventory.update')
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
    @Request() req: any,
  ) {
    return this.inventoryService.adjustStock(id, dto, req.user?.id);
  }

  @Get('products/:id/movements')
  @RequirePermissions('inventory.read')
  getProductMovements(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.getProductMovements(id);
  }

  // ---------------- WORKFLOW & PARCEL INTEGRATION ---------------- //

  @Get('parcels/:parcelId/items')
  @RequirePermissions('inventory.read')
  getParcelItems(@Param('parcelId', ParseIntPipe) parcelId: number) {
    return this.inventoryService.getParcelItems(parcelId);
  }

  @Post('parcels/:parcelId/reserve')
  @RequirePermissions('inventory.update')
  reserveStock(
    @Param('parcelId', ParseIntPipe) parcelId: number,
    @Body('items') items: Array<{ productId: number; quantity: number; price?: number }>,
    @Request() req: any,
  ) {
    return this.inventoryService.reserveStockForParcel(parcelId, items, req.user?.id);
  }

  @Post('pick-pack/scan')
  @RequirePermissions('inventory.pick_pack')
  scanPickItem(@Body() dto: ScanBarcodeDto) {
    return this.inventoryService.scanBarcodeForPick(dto.parcelId, dto.barcode);
  }

  @Post('parcels/:parcelId/restock')
  @RequirePermissions('inventory.restock')
  restockParcel(
    @Param('parcelId', ParseIntPipe) parcelId: number,
    @Body() dto: RestockParcelDto,
    @Request() req: any,
  ) {
    return this.inventoryService.restockFailedParcel(
      parcelId,
      dto.action,
      dto.note,
      req.user?.id,
    );
  }
}
