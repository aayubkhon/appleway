import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createCustomerRequestSchema,
  createDebtRequestSchema,
  createPaymentRequestSchema,
  customerListQuerySchema,
  debtListQuerySchema,
  updateCustomerRequestSchema,
  updateDebtRequestSchema,
  type Customer,
  type Debt,
  type DebtDetail,
  type DebtListQuery,
  type LedgerSummary,
} from '@appleway/shared';

import { CurrentUserId, JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CustomersService, type CustomerInput } from './customers.service.js';
import {
  DebtsService,
  type CreateDebtInput,
  type CreatePaymentInput,
  type UpdateDebtInput,
} from './debts.service.js';
import { summarize } from './ledger-rules.js';
import { LedgerRepository } from './ledger.repository.js';

/** Path ids are validated before any query; a malformed id is a 400, not a 500. */
const uuid = new ParseUUIDPipe({ version: '4' });

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(
    @CurrentUserId() ownerId: string,
    @Query(new ZodValidationPipe(customerListQuerySchema)) query: { q?: string },
  ): Promise<Customer[]> {
    return this.customers.list(ownerId, query.q);
  }

  @Post()
  create(
    @CurrentUserId() ownerId: string,
    @Body(new ZodValidationPipe(createCustomerRequestSchema))
    body: CustomerInput & { name: string },
  ): Promise<Customer> {
    return this.customers.create(ownerId, body);
  }

  @Get(':id')
  get(@CurrentUserId() ownerId: string, @Param('id', uuid) id: string): Promise<Customer> {
    return this.customers.get(ownerId, id);
  }

  @Patch(':id')
  update(
    @CurrentUserId() ownerId: string,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(updateCustomerRequestSchema)) body: CustomerInput,
  ): Promise<Customer> {
    return this.customers.update(ownerId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUserId() ownerId: string, @Param('id', uuid) id: string): Promise<void> {
    return this.customers.remove(ownerId, id);
  }
}

@Controller('debts')
@UseGuards(JwtAuthGuard)
export class DebtsController {
  constructor(private readonly debts: DebtsService) {}

  @Get()
  list(
    @CurrentUserId() ownerId: string,
    @Query(new ZodValidationPipe(debtListQuerySchema)) query: DebtListQuery,
  ): Promise<Debt[]> {
    return this.debts.list(ownerId, query);
  }

  @Post()
  create(
    @CurrentUserId() ownerId: string,
    @Body(new ZodValidationPipe(createDebtRequestSchema)) body: CreateDebtInput,
  ): Promise<DebtDetail> {
    return this.debts.create(ownerId, body);
  }

  @Get(':id')
  get(@CurrentUserId() ownerId: string, @Param('id', uuid) id: string): Promise<DebtDetail> {
    return this.debts.get(ownerId, id);
  }

  @Patch(':id')
  update(
    @CurrentUserId() ownerId: string,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(updateDebtRequestSchema)) body: UpdateDebtInput,
  ): Promise<DebtDetail> {
    return this.debts.update(ownerId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUserId() ownerId: string, @Param('id', uuid) id: string): Promise<void> {
    return this.debts.remove(ownerId, id);
  }

  @Post(':id/payments')
  addPayment(
    @CurrentUserId() ownerId: string,
    @Param('id', uuid) id: string,
    @Body(new ZodValidationPipe(createPaymentRequestSchema)) body: CreatePaymentInput,
  ): Promise<DebtDetail> {
    return this.debts.addPayment(ownerId, id, body);
  }
}

@Controller('summary')
@UseGuards(JwtAuthGuard)
export class SummaryController {
  constructor(private readonly ledger: LedgerRepository) {}

  @Get()
  async get(@CurrentUserId() ownerId: string): Promise<LedgerSummary> {
    const today = await this.ledger.todayFor(ownerId);
    return summarize(await this.ledger.debts(ownerId, today), today);
  }
}
