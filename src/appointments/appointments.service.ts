import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.appointment.findMany({
      where: { organizationId },
      orderBy: { startsAt: 'asc' },
    });
  }

  // Appointments within a date range (for the calendar grid).
  findRange(organizationId: string, from?: string, to?: string) {
    const where: any = { organizationId };
    if (from || to) {
      where.startsAt = {};
      if (from) where.startsAt.gte = new Date(from);
      if (to) where.startsAt.lte = new Date(to);
    }
    return this.prisma.appointment.findMany({ where, orderBy: { startsAt: 'asc' } });
  }

  create(organizationId: string, dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: { ...dto, startsAt: new Date(dto.startsAt), organizationId },
    });
  }
}
