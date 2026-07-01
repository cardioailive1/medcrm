import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.patient.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const p = await this.prisma.patient.findFirst({ where: { id, organizationId } });
    if (!p) throw new NotFoundException('Patient not found');
    return p;
  }

  async create(organizationId: string, dto: CreatePatientDto) {
    const exists = await this.prisma.patient.findFirst({
      where: { organizationId, mrn: dto.mrn },
    });
    if (exists) throw new ConflictException('MRN already exists');
    return this.prisma.patient.create({
      data: { ...dto, dob: new Date(dto.dob), organizationId },
    });
  }

  async update(organizationId: string, id: string, dto: UpdatePatientDto) {
    await this.findOne(organizationId, id);
    const data: any = { ...dto };
    if (dto.dob) data.dob = new Date(dto.dob);
    return this.prisma.patient.update({ where: { id }, data });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.prisma.patient.delete({ where: { id } });
    return { success: true };
  }

  // Example of a PRO-tier gated analytics endpoint.
  async stats(organizationId: string) {
    const grouped = await this.prisma.patient.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });
    const total = await this.prisma.patient.count({ where: { organizationId } });
    return { total, byStatus: grouped };
  }
}
