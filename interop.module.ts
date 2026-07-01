import { Module } from '@nestjs/common';
import { InteropService } from './interop.service';
import { InteropController } from './interop.controller';
@Module({ controllers: [InteropController], providers: [InteropService] })
export class InteropModule {}
