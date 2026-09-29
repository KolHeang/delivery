import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, ILike, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { ParcelItem } from './entities/parcel-item.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import {
  CreateProductDto,
  UpdateProductDto,
  AdjustStockDto,
} from './dto/product.dto';
import { paginateRepo } from '../config/pagination';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(ParcelItem)
    private readonly parcelItemRepo: Repository<ParcelItem>,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------- PRODUCT MANAGEMENT ---------------- //

  async findAllProducts(query?: {
    page?: number;
    limit?: number;
    search?: string;
    merchantId?: number;
    category?: string;
    active?: boolean;
    lowStock?: boolean;
  }) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.merchant', 'merchant')
      .orderBy('p.id', 'DESC');

    if (query?.merchantId) {
      qb.andWhere('p.merchantId = :merchantId', { merchantId: query.merchantId });
    }

    if (query?.category) {
      qb.andWhere('p.category = :category', { category: query.category });
    }

    if (query?.active !== undefined) {
      qb.andWhere('p.active = :active', { active: query.active });
    }

    if (query?.lowStock) {
      qb.andWhere('(p.quantity - p.reservedQuantity) <= p.minStockAlert');
    }

    if (query?.search) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        '(p.name ILIKE :s OR p.nameKh ILIKE :s OR p.sku ILIKE :s OR p.barcode ILIKE :s)',
        { s },
      );
    }

    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: items.map((prod) => ({
        ...prod,
        availableQuantity: Math.max(0, (prod.quantity || 0) - (prod.reservedQuantity || 0)),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneProduct(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: { merchant: true },
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return product;
  }

  async createProduct(dto: CreateProductDto, userId?: number): Promise<Product> {
    const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new BadRequestException(`Product with SKU "${dto.sku}" already exists`);
    }

    const initialQty = dto.quantity || 0;
    const product = this.productRepo.create({
      ...dto,
      quantity: initialQty,
      reservedQuantity: 0,
    });

    const saved = await this.productRepo.save(product);

    if (initialQty > 0) {
      await this.movementRepo.save(
        this.movementRepo.create({
          productId: saved.id,
          type: 'IN',
          quantity: initialQty,
          previousQuantity: 0,
          newQuantity: initialQty,
          referenceType: 'initial_stock',
          note: 'Initial stock on creation',
          performedById: userId,
        }),
      );
    }

    return this.findOneProduct(saved.id);
  }

  async updateProduct(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneProduct(id);
    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
      if (existing && existing.id !== id) {
        throw new BadRequestException(`SKU "${dto.sku}" is already in use`);
      }
    }
    await this.productRepo.update(id, dto);
    return this.findOneProduct(id);
  }

  async removeProduct(id: number): Promise<{ success: boolean }> {
    const product = await this.findOneProduct(id);
    await this.productRepo.remove(product);
    return { success: true };
  }

  // ---------------- STOCK ADJUSTMENT & MOVEMENTS ---------------- //

  async adjustStock(
    id: number,
    dto: AdjustStockDto,
    userId?: number,
  ): Promise<Product> {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(`Product #${id} not found`);
      }

      const prevQty = product.quantity || 0;
      let newQty = prevQty;

      if (dto.type === 'IN') {
        newQty = prevQty + dto.quantity;
      } else if (dto.type === 'OUT' || dto.type === 'DAMAGED') {
        if (prevQty < dto.quantity) {
          throw new BadRequestException(
            `Insufficient on-hand stock (Available: ${prevQty}, Required: ${dto.quantity})`,
          );
        }
        newQty = prevQty - dto.quantity;
      } else if (dto.type === 'ADJUST') {
        newQty = dto.quantity;
      }

      product.quantity = newQty;
      await manager.save(Product, product);

      await manager.save(
        StockMovement,
        manager.create(StockMovement, {
          productId: product.id,
          type: dto.type,
          quantity: dto.quantity,
          previousQuantity: prevQty,
          newQuantity: newQty,
          referenceType: dto.referenceType || 'manual',
          referenceId: dto.referenceId,
          note: dto.note || `Manual ${dto.type} adjustment`,
          performedById: userId,
        }),
      );

      return product;
    });
  }

  async getProductMovements(productId: number) {
    return this.movementRepo.find({
      where: { productId },
      relations: { performedBy: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // ---------------- WORKFLOW INTEGRATION ---------------- //

  /**
   * 1. Order Creation -> Reserve Stock
   */
  async reserveStockForParcel(
    parcelId: number,
    items: Array<{ productId: number; quantity: number; price?: number }>,
    userId?: number,
  ) {
    if (!items || items.length === 0) return;

    return this.dataSource.transaction(async (manager) => {
      const parcel = await manager.findOne(Parcel, { where: { id: parcelId } });
      if (!parcel) throw new NotFoundException(`Parcel #${parcelId} not found`);

      for (const item of items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new NotFoundException(`Product #${item.productId} not found`);
        }

        const available = (product.quantity || 0) - (product.reservedQuantity || 0);
        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}" (Available: ${available}, Requested: ${item.quantity})`,
          );
        }

        // Increase reserved quantity
        const prevReserved = product.reservedQuantity || 0;
        product.reservedQuantity = prevReserved + item.quantity;
        await manager.save(Product, product);

        // Record Parcel Item
        const itemPrice = item.price !== undefined ? item.price : product.price;
        const parcelItem = manager.create(ParcelItem, {
          parcelId,
          productId: product.id,
          quantity: item.quantity,
          price: itemPrice,
          totalPrice: Number(itemPrice) * item.quantity,
          isPicked: false,
        });
        await manager.save(ParcelItem, parcelItem);

        // Log movement
        await manager.save(
          StockMovement,
          manager.create(StockMovement, {
            productId: product.id,
            type: 'RESERVE',
            quantity: item.quantity,
            previousQuantity: product.quantity,
            newQuantity: product.quantity,
            referenceType: 'parcel',
            referenceId: parcel.trackingCode || String(parcel.id),
            note: `Reserved ${item.quantity} units for Order ${parcel.trackingCode || parcel.id}`,
            performedById: userId,
          }),
        );
      }
    });
  }

  /**
   * 2. Pick & Pack -> Scan Barcode to verify item
   */
  async scanBarcodeForPick(parcelId: number, barcodeOrSku: string) {
    const trimmed = barcodeOrSku.trim();
    const items = await this.parcelItemRepo.find({
      where: { parcelId },
      relations: { product: true },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException(`No items found for Parcel #${parcelId}`);
    }

    const matched = items.find(
      (item) =>
        (item.product.barcode && item.product.barcode.toLowerCase() === trimmed.toLowerCase()) ||
        (item.product.sku && item.product.sku.toLowerCase() === trimmed.toLowerCase()),
    );

    if (!matched) {
      throw new BadRequestException(
        `Barcode / SKU "${trimmed}" does not match any items in this parcel`,
      );
    }

    matched.isPicked = true;
    matched.pickedAt = new Date();
    await this.parcelItemRepo.save(matched);

    const allPicked = items.every((i) => (i.id === matched.id ? true : i.isPicked));

    return {
      success: true,
      matchedItem: matched,
      allPicked,
      message: allPicked
        ? 'All items in this parcel are verified and packed!'
        : `Verified item: ${matched.product.name}`,
    };
  }

  /**
   * 3. Dispatch / In-Transit -> Deduct stock permanently
   */
  async deductStockOnDispatch(parcelId: number, userId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const parcel = await manager.findOne(Parcel, { where: { id: parcelId } });
      if (!parcel) return;

      const items = await manager.find(ParcelItem, {
        where: { parcelId },
        relations: { product: true },
      });

      if (!items || items.length === 0) return;

      for (const item of items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) continue;

        const prevQty = product.quantity || 0;
        const prevReserved = product.reservedQuantity || 0;

        // Deduct physical stock & release reserved stock
        product.quantity = Math.max(0, prevQty - item.quantity);
        product.reservedQuantity = Math.max(0, prevReserved - item.quantity);
        await manager.save(Product, product);

        // Record stock movement OUT
        await manager.save(
          StockMovement,
          manager.create(StockMovement, {
            productId: product.id,
            type: 'OUT',
            quantity: item.quantity,
            previousQuantity: prevQty,
            newQuantity: product.quantity,
            referenceType: 'parcel',
            referenceId: parcel.trackingCode || String(parcel.id),
            note: `Dispatched / In-Transit: deducted ${item.quantity} units for Order ${parcel.trackingCode || parcel.id}`,
            performedById: userId,
          }),
        );
      }
    });
  }

  /**
   * Cancelled / Voided Order -> Release reserved stock
   */
  async releaseReservationOnCancel(parcelId: number, userId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const parcel = await manager.findOne(Parcel, { where: { id: parcelId } });
      if (!parcel) return;

      const items = await manager.find(ParcelItem, {
        where: { parcelId },
        relations: { product: true },
      });

      if (!items || items.length === 0) return;

      for (const item of items) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) continue;

        const prevReserved = product.reservedQuantity || 0;
        product.reservedQuantity = Math.max(0, prevReserved - item.quantity);
        await manager.save(Product, product);

        await manager.save(
          StockMovement,
          manager.create(StockMovement, {
            productId: product.id,
            type: 'RELEASE',
            quantity: item.quantity,
            previousQuantity: product.quantity,
            newQuantity: product.quantity,
            referenceType: 'parcel',
            referenceId: parcel.trackingCode || String(parcel.id),
            note: `Cancelled order: released reservation for ${parcel.trackingCode || parcel.id}`,
            performedById: userId,
          }),
        );
      }
    });
  }

  /**
   * 4. Return / Failed Delivery -> Restock or Damaged Write-Off
   */
  async restockFailedParcel(
    parcelId: number,
    action: 'RESTOCK' | 'DAMAGED',
    note?: string,
    userId?: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const parcel = await manager.findOne(Parcel, { where: { id: parcelId } });
      if (!parcel) throw new NotFoundException(`Parcel #${parcelId} not found`);

      const items = await manager.find(ParcelItem, {
        where: { parcelId },
        relations: { product: true },
      });

      if (!items || items.length === 0) {
        throw new BadRequestException(`No inventory items found for Parcel #${parcelId}`);
      }

      for (const item of items) {
        if (item.isRestocked) continue; // prevent duplicate restocking

        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) continue;

        const prevQty = product.quantity || 0;

        if (action === 'RESTOCK') {
          product.quantity = prevQty + item.quantity;
          await manager.save(Product, product);

          await manager.save(
            StockMovement,
            manager.create(StockMovement, {
              productId: product.id,
              type: 'RETURN',
              quantity: item.quantity,
              previousQuantity: prevQty,
              newQuantity: product.quantity,
              referenceType: 'parcel',
              referenceId: parcel.trackingCode || String(parcel.id),
              note: note || `Returned parcel received at warehouse: restocked ${item.quantity} units`,
              performedById: userId,
            }),
          );
        } else if (action === 'DAMAGED') {
          // Do not add back to physical sellable stock, log as damaged
          await manager.save(
            StockMovement,
            manager.create(StockMovement, {
              productId: product.id,
              type: 'DAMAGED',
              quantity: item.quantity,
              previousQuantity: prevQty,
              newQuantity: prevQty,
              referenceType: 'parcel',
              referenceId: parcel.trackingCode || String(parcel.id),
              note: note || `Returned parcel damaged: write-off ${item.quantity} units`,
              performedById: userId,
            }),
          );
        }

        item.isRestocked = true;
        await manager.save(ParcelItem, item);
      }

      return {
        success: true,
        message:
          action === 'RESTOCK'
            ? 'Items successfully restocked into warehouse inventory'
            : 'Items recorded as damaged write-off',
      };
    });
  }

  async getParcelItems(parcelId: number) {
    return this.parcelItemRepo.find({
      where: { parcelId },
      relations: { product: true },
    });
  }
}
