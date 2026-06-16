import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './invoice.entity';
import { Order } from '../orders/order.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  async createInvoices(orderIds: number[]): Promise<Invoice[]> {
    const invoices: Invoice[] = [];
    for (const orderId of orderIds) {
      const order = await this.orderRepo.findOne({ where: { id: orderId } });
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Generate a unique invoice number
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(100 + Math.random() * 900);
      const invoiceNumber = `INV-${order.trackingCode}-${timestamp}${random}`;

      const invoice = this.invoiceRepo.create({
        invoiceNumber,
        orderId,
      });
      const saved = await this.invoiceRepo.save(invoice);
      invoices.push(saved);
    }
    return invoices;
  }

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepo.find({
      relations: { order: true },
      order: { printedAt: 'DESC' },
    });
  }
}
