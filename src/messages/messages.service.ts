import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './create-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.message.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  create(organizationId: string, dto: CreateMessageDto) {
    return this.prisma.message.create({
      data: { ...dto, preview: dto.preview ?? dto.body.slice(0, 80), organizationId },
    });
  }

  async markRead(organizationId: string, id: string) {
    const m = await this.prisma.message.findFirst({ where: { id, organizationId } });
    if (!m) throw new NotFoundException('Message not found');
    return this.prisma.message.update({ where: { id }, data: { unread: false } });
  }
}
