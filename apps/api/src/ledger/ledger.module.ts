import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CustomersService } from './customers.service.js';
import { DebtsService } from './debts.service.js';
import { CustomersController, DebtsController, SummaryController } from './ledger.controllers.js';
import { LedgerRepository } from './ledger.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController, DebtsController, SummaryController],
  providers: [LedgerRepository, CustomersService, DebtsService],
})
export class LedgerModule {}
