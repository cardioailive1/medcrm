import { Module } from '@nestjs/common';
import { TelehealthService } from './telehealth.service';
import { TelehealthController } from './telehealth.controller';
@Module({ controllers: [TelehealthController], providers: [TelehealthService] })
export class TelehealthModule {}
