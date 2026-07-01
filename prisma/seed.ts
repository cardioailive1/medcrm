import {
  PrismaClient, Role, Tier, SubscriptionStatus, PatientStatus,
  Modality, AppointmentStatus, SessionStatus, PipelineStage, SurveyStatus,
  AdminTaskStatus, ComplianceStatus, InsightImpact,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

function at(h: number, m = 0) { const d = new Date(); d.setHours(h, m, 0, 0); return d; }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d; }

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'seed-org' },
    update: {},
    create: {
      id: 'seed-org',
      name: 'City Medical Center',
      tier: Tier.ENTERPRISE,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });
  const orgId = org.id;

  const passwordHash = await argon2.hash('ChangeMe123!');
  const users = [
    { email: 'admin@citymedical.org', firstName: 'Sarah', lastName: 'Harper', role: Role.ADMIN },
    { email: 'park@citymedical.org', firstName: 'James', lastName: 'Park', role: Role.PHYSICIAN },
    { email: 'nurse@citymedical.org', firstName: 'Nina', lastName: 'Kim', role: Role.NURSE },
    { email: 'billing@citymedical.org', firstName: 'Bea', lastName: 'Ling', role: Role.BILLING },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash, organizationId: orgId } });
  }

  // Patients
  const patients = [
    { mrn: 'PT-00441', firstName: 'Maria', lastName: 'Gonzalez', dob: '1978-03-12', department: 'Cardiology', providerName: 'Dr. Park', status: PatientStatus.ACTIVE },
    { mrn: 'PT-00398', firstName: 'James', lastName: 'Wilson', dob: '1964-07-24', department: 'Primary Care', providerName: 'Dr. Chen', status: PatientStatus.ACTIVE },
    { mrn: 'PT-00502', firstName: 'Priya', lastName: 'Sharma', dob: '1990-11-05', department: 'Neurology', providerName: 'Dr. Harper', status: PatientStatus.AT_RISK },
    { mrn: 'PT-00517', firstName: 'Robert', lastName: 'Kim', dob: '1985-02-18', department: 'Orthopedics', providerName: 'Dr. Park', status: PatientStatus.NEW },
    { mrn: 'PT-00455', firstName: 'David', lastName: 'Torres', dob: '1972-05-14', department: 'Primary Care', providerName: 'Dr. Harper', status: PatientStatus.ACTIVE },
  ];
  for (const p of patients) {
    await prisma.patient.upsert({
      where: { organizationId_mrn: { organizationId: orgId, mrn: p.mrn } },
      update: {},
      create: { ...p, dob: new Date(p.dob), organizationId: orgId },
    });
  }

  // Idempotent reset of demo collections
  await prisma.appointment.deleteMany({ where: { organizationId: orgId } });
  await prisma.telehealthSession.deleteMany({ where: { organizationId: orgId } });
  await prisma.pipelineEntry.deleteMany({ where: { organizationId: orgId } });
  await prisma.message.deleteMany({ where: { organizationId: orgId } });
  await prisma.agentActivity.deleteMany({ where: { organizationId: orgId } });
  await prisma.workflowTask.deleteMany({ where: { organizationId: orgId } });
  await prisma.survey.deleteMany({ where: { organizationId: orgId } });
  await prisma.cmsMeasure.deleteMany({ where: { organizationId: orgId } });
  await prisma.interopResource.deleteMany({ where: { organizationId: orgId } });

  await prisma.appointment.createMany({ data: [
    { organizationId: orgId, patientName: 'Maria Gonzalez', providerName: 'Dr. Park', department: 'Cardiology', type: 'Follow-up', modality: Modality.IN_PERSON, startsAt: at(9, 0), status: AppointmentStatus.CHECKED_IN },
    { organizationId: orgId, patientName: 'James Wilson', providerName: 'Dr. Chen', department: 'Telehealth', type: 'Follow-up', modality: Modality.TELEHEALTH, startsAt: at(9, 30), status: AppointmentStatus.CONFIRMED },
    { organizationId: orgId, patientName: 'Priya Sharma', providerName: 'Dr. Harper', department: 'Neurology', type: 'Lab Results', modality: Modality.IN_PERSON, startsAt: at(10, 0), status: AppointmentStatus.WAITING },
    { organizationId: orgId, patientName: 'Robert Kim', providerName: 'New Patient', department: 'Telehealth', type: 'Intake', modality: Modality.TELEHEALTH, startsAt: at(10, 45), status: AppointmentStatus.CONFIRMED },
    { organizationId: orgId, patientName: 'Susan Okafor', providerName: 'Dr. Chen', department: 'Cardiology', type: 'Physical', modality: Modality.IN_PERSON, startsAt: at(11, 15), status: AppointmentStatus.NO_SHOW },
  ]});

  await prisma.telehealthSession.createMany({ data: [
    { organizationId: orgId, patientName: 'James Wilson', providerName: 'Dr. Harper', department: 'Primary Care', type: 'Follow-up', status: SessionStatus.IN_SESSION, durationSec: 504, recordingReady: false },
    { organizationId: orgId, patientName: 'Robert Kim', providerName: 'Dr. Park', department: 'Orthopedics', type: 'New Patient', status: SessionStatus.WAITING, waitMinutes: 6 },
    { organizationId: orgId, patientName: 'David Torres', providerName: 'Dr. Harper', department: 'Primary Care', type: 'Check-in', status: SessionStatus.WAITING, waitMinutes: 18 },
    { organizationId: orgId, patientName: 'Angela Lee', providerName: 'Dr. Harper', department: 'Primary Care', type: 'Labs review', status: SessionStatus.SCHEDULED, scheduledAt: at(14, 0) },
    { organizationId: orgId, patientName: 'Maria Gonzalez', providerName: 'Dr. Park', department: 'Cardiology', type: 'Medication review', status: SessionStatus.COMPLETED, durationSec: 1331, recordingReady: true },
  ]});

  await prisma.pipelineEntry.createMany({ data: [
    { organizationId: orgId, patientName: 'Robert Kim', department: 'Orthopedics', stage: PipelineStage.REFERRAL, status: 'New', estVisits: 'Est. 2 visits', dueDate: daysFromNow(0) },
    { organizationId: orgId, patientName: 'Marcus Webb', department: 'Cardiology', stage: PipelineStage.REFERRAL, status: 'Urgent', estVisits: 'Est. 6 visits', dueDate: daysFromNow(0) },
    { organizationId: orgId, patientName: 'Priya Sharma', department: 'Neurology', stage: PipelineStage.ASSESSMENT, status: 'Pending test', estVisits: 'Est. 5 visits', dueDate: daysFromNow(2) },
    { organizationId: orgId, patientName: 'Maria Gonzalez', department: 'Cardiology', stage: PipelineStage.TREATMENT, status: 'On track', estVisits: 'Visit 4/8', dueDate: daysFromNow(6) },
    { organizationId: orgId, patientName: 'David Torres', department: 'Primary Care', stage: PipelineStage.MONITORING, status: 'Stable', estVisits: 'Quarterly', dueDate: daysFromNow(80) },
    { organizationId: orgId, patientName: 'Kevin Shah', department: 'Orthopedics', stage: PipelineStage.DISCHARGED, status: 'Discharged', estVisits: 'Completed', dueDate: daysFromNow(-6) },
  ]});

  await prisma.message.createMany({ data: [
    { organizationId: orgId, senderName: 'Priya Sharma', body: 'My headache has gotten worse overnight and I am now experiencing some blurred vision.', preview: 'My headache got worse overnight…', unread: true },
    { organizationId: orgId, senderName: 'James Wilson', body: 'Can I reschedule my Thursday appointment to the following week?', preview: 'Can I reschedule my Thursday…', unread: true },
    { organizationId: orgId, senderName: 'Front Desk', body: '3 no-show alerts for today\'s morning schedule.', preview: '3 no-show alerts for today\'s…', unread: true },
    { organizationId: orgId, senderName: 'Angela Lee', body: 'Thank you for the quick response!', preview: 'Thank you for the quick response!', unread: false },
  ]});

  await prisma.agentActivity.createMany({ data: [
    { organizationId: orgId, source: 'TRIAGE', message: 'Flagged Priya Sharma #PT-00502 — BP 158/96, headache + blurred vision → escalated', level: 'warn' },
    { organizationId: orgId, source: 'LAB', message: 'HL7 ORU^R01 received from Quest — 14 results parsed → 3 abnormal flagged', level: 'info' },
    { organizationId: orgId, source: 'BILLING', message: 'Auto-coded James Wilson encounter — ICD-10 E11.9, Z79.4 — claim submitted $284', level: 'info' },
    { organizationId: orgId, source: 'FOLLOW-UP', message: 'Sent 6 appointment reminders via SMS — 3 confirmed, 2 pending, 1 failed', level: 'info' },
    { organizationId: orgId, source: 'FHIR', message: 'FHIR R4 sync completed — 248 Patient, 1,340 Observation resources updated', level: 'info' },
  ]});

  await prisma.workflowTask.createMany({ data: [
    { organizationId: orgId, board: 'clinical', lane: 'triage', title: 'Marcus Webb', subtitle: 'Chest pain, SOB · Cardiac rule-out', priority: 'urgent', assignee: 'DH', tags: ['Critical', 'Cardio'] },
    { organizationId: orgId, board: 'clinical', lane: 'assessment', title: 'Linda Chen', subtitle: 'Altered mental status · Neuro eval', priority: 'urgent', assignee: 'DH', tags: ['Critical', 'Neuro'] },
    { organizationId: orgId, board: 'clinical', lane: 'discharge', title: 'Susan Okafor', subtitle: 'Cleared · Awaiting transport', priority: 'normal', assignee: 'AT', tags: ['Discharge ready'] },
    { organizationId: orgId, board: 'nursing', lane: 'pending', title: 'ICU Bed 4 — Vent check', subtitle: 'Ventilator settings review · q2h', priority: 'urgent', assignee: 'MP', tags: ['Overdue'] },
    { organizationId: orgId, board: 'nursing', lane: 'inprogress', title: 'Priya Sharma — Assessment', subtitle: 'Neuro vitals, GCS, pupil check', priority: 'normal', assignee: 'NK', tags: ['In progress'] },
    { organizationId: orgId, board: 'physician', lane: 'orders', title: 'STAT — Norepinephrine drip', subtitle: 'ICU Bed 4 · 0.1 mcg/kg/min IV', priority: 'urgent', assignee: 'DH', tags: ['STAT'] },
    { organizationId: orgId, board: 'physician', lane: 'consults', title: 'Neuro consult — Marcus Webb', subtitle: 'Requested: stroke evaluation', priority: 'high', assignee: 'JP', tags: ['Consult sent'] },
  ]});

  await prisma.survey.createMany({ data: [
    { organizationId: orgId, patientName: 'Maria Gonzalez', department: 'Cardiology', rating: 5, comment: 'Dr. Park was incredibly attentive and explained everything clearly.', status: SurveyStatus.NEW },
    { organizationId: orgId, patientName: 'James Wilson', department: 'Telehealth', rating: 4, comment: 'The telehealth visit was smooth. Wait time a little long.', status: SurveyStatus.NEW },
    { organizationId: orgId, patientName: 'Robert Kim', department: 'Billing', rating: 1, comment: 'The billing process was confusing and I was charged incorrectly.', status: SurveyStatus.REVIEW },
    { organizationId: orgId, patientName: 'Susan Okafor', department: 'Cardiology', rating: 1, comment: 'I felt dismissed when I raised concerns about my medication.', status: SurveyStatus.ACTION },
    { organizationId: orgId, patientName: 'Anonymous', department: 'Neurology', rating: 1, comment: 'Appointment cancelled last minute with no explanation.', status: SurveyStatus.ESCALATED },
    { organizationId: orgId, patientName: 'Natalie Cross', department: 'Operations', rating: 5, comment: 'They called to apologize and gave me priority scheduling.', status: SurveyStatus.RESOLVED },
  ]});

  await prisma.cmsMeasure.createMany({ data: [
    { organizationId: orgId, program: 'MIPS', name: 'Diabetes HbA1c Control', value: 82, target: 75, unit: '%', status: 'met' },
    { organizationId: orgId, program: 'MIPS', name: 'Hypertension Control', value: 76, target: 70, unit: '%', status: 'met' },
    { organizationId: orgId, program: 'MIPS', name: '30-Day Readmissions (HF)', value: 18.2, target: 15, unit: '%', status: 'below' },
    { organizationId: orgId, program: 'PI', name: 'e-Prescribing', value: 95, target: 80, unit: '%', status: 'met' },
    { organizationId: orgId, program: 'PI', name: 'Patient Access API', value: 50, target: 75, unit: '%', status: 'below' },
    { organizationId: orgId, program: 'STAR', name: 'Process of Care', value: 90, target: 80, unit: '%', status: 'met' },
    { organizationId: orgId, program: 'STAR', name: 'Patient Experience', value: 82, target: 80, unit: '%', status: 'met' },
  ]});

  await prisma.interopResource.createMany({ data: [
    { organizationId: orgId, kind: 'FHIR', resourceType: 'Patient', label: 'Priya Sharma — id: pat-00502', meta: 'Epic EHR source', status: 'synced' },
    { organizationId: orgId, kind: 'FHIR', resourceType: 'Observation', label: 'BP 158/96 — #obs-20260408-004', meta: 'Subject: pat-00502', status: 'flagged' },
    { organizationId: orgId, kind: 'HL7', resourceType: 'ADT^A01', label: 'Robert Kim admitted — Ward 3B', meta: 'MRN 00517 · Cerner', status: 'processed' },
    { organizationId: orgId, kind: 'HL7', resourceType: 'ORU^R01', label: '14 lab results — Quest Diagnostics', meta: '8 patients', status: 'processed' },
    { organizationId: orgId, kind: 'PACS', resourceType: 'MRI', label: 'Brain MRI w/ contrast — Priya Sharma', meta: '24 series · 480 images', status: 'synced' },
    { organizationId: orgId, kind: 'PACS', resourceType: 'CT', label: 'Chest CT — PE protocol — Marcus Webb', meta: '3 series · 210 images', status: 'synced' },
  ]});

  await prisma.adminTask.deleteMany({ where: { organizationId: orgId } });
  await prisma.automation.deleteMany({ where: { organizationId: orgId } });
  await prisma.complianceItem.deleteMany({ where: { organizationId: orgId } });
  await prisma.scheduledReport.deleteMany({ where: { organizationId: orgId } });
  await prisma.insight.deleteMany({ where: { organizationId: orgId } });

  await prisma.adminTask.createMany({ data: [
    { organizationId: orgId, category: 'INS', title: 'Insurance verification — Robert Kim', subtitle: 'Aetna PPO eligibility · New patient pre-visit', status: AdminTaskStatus.IN_PROGRESS },
    { organizationId: orgId, category: 'REF', title: 'Referral routing — Linda Chen', subtitle: 'Incoming fax from Dr. Patel → Neurology', status: AdminTaskStatus.QUEUED },
    { organizationId: orgId, category: 'INT', title: 'Intake forms — Marcus Webb', subtitle: 'ER patient · Pre-populated from Epic FHIR record', status: AdminTaskStatus.COMPLETE },
    { organizationId: orgId, category: 'COMP', title: 'HIPAA training — Amy Torres, LPN', subtitle: 'Annual re-certification due in 7 days', status: AdminTaskStatus.DUE_SOON },
    { organizationId: orgId, category: 'DOC', title: 'Document OCR — Fax received 09:42', subtitle: 'Lab report from Quest · Linked to PT-00502', status: AdminTaskStatus.COMPLETE },
    { organizationId: orgId, category: 'SCHED', title: 'Schedule optimization — Week of Apr 14', subtitle: 'Balancing 5 providers · 3 PTO conflicts resolved', status: AdminTaskStatus.COMPLETE },
    { organizationId: orgId, category: 'LIC', title: 'License renewal — Dr. James Park', subtitle: 'Ohio medical license expires soon', status: AdminTaskStatus.PENDING },
  ]});

  await prisma.automation.createMany({ data: [
    { organizationId: orgId, name: 'Patient Intake', description: 'Auto-generates digital intake forms, pre-populates from FHIR, triggers e-signature.', runs: 112, active: true, lastRunAt: new Date() },
    { organizationId: orgId, name: 'Insurance Verification', description: 'Real-time 270/271 eligibility checks; flags lapsed coverage before visits.', runs: 89, active: true, lastRunAt: new Date() },
    { organizationId: orgId, name: 'Referral Routing', description: 'Parses referral faxes/HL7 REF, matches specialist, creates FHIR ServiceRequest.', runs: 34, active: true, lastRunAt: new Date() },
    { organizationId: orgId, name: 'Staff Scheduling', description: 'Balances shifts by predicted volume; enforces nursing ratios.', runs: 8, active: true, lastRunAt: new Date() },
    { organizationId: orgId, name: 'Compliance Reminders', description: 'Tracks license/training/HIPAA deadlines; escalating reminders.', runs: 21, active: true, lastRunAt: new Date() },
    { organizationId: orgId, name: 'Document Management', description: 'Classifies/routes faxes; OCR indexes; links FHIR DocumentReference.', runs: 58, active: true, lastRunAt: new Date() },
  ]});

  await prisma.complianceItem.createMany({ data: [
    { organizationId: orgId, title: 'Joint Commission survey — overdue documentation', subtitle: '3 policies not updated since Jan', status: ComplianceStatus.ACTION_NEEDED },
    { organizationId: orgId, title: 'HIPAA certification — 2 staff pending', subtitle: 'Amy Torres, Nina Kim', status: ComplianceStatus.DUE_SOON, dueDate: daysFromNow(5) },
    { organizationId: orgId, title: 'DEA license — Dr. Arjun Patel', subtitle: 'Renewal initiated', status: ComplianceStatus.IN_PROGRESS, dueDate: daysFromNow(50) },
    { organizationId: orgId, title: 'HIPAA Risk Assessment — completed', subtitle: 'Annual assessment filed', status: ComplianceStatus.COMPLETE },
  ]});

  await prisma.scheduledReport.createMany({ data: [
    { organizationId: orgId, name: 'Daily Operations Summary', schedule: 'Daily · 5:00 PM', format: 'Email', recipients: 'Admin team' },
    { organizationId: orgId, name: 'Weekly Revenue & Billing Report', schedule: 'Monday 8:00 AM', format: 'PDF', recipients: 'CFO + billing' },
    { organizationId: orgId, name: 'Patient Satisfaction Monthly', schedule: '1st of month', format: 'Excel', recipients: 'Quality team' },
    { organizationId: orgId, name: 'Provider Performance Quarterly', schedule: 'Quarterly', format: 'PDF + CSV', recipients: 'Medical director' },
    { organizationId: orgId, name: 'FHIR Sync Health Report', schedule: 'Daily · 6:00 AM', format: 'JSON', recipients: 'IT team' },
    { organizationId: orgId, name: 'HIPAA Audit Log Report', schedule: 'Weekly', format: 'PDF', recipients: 'Compliance officer' },
  ]});

  await prisma.insight.createMany({ data: [
    { organizationId: orgId, title: 'No-show rate trending upward — April cohort +3.2%', body: 'No-shows reached 11.4% this week vs 8.2% last month, clustering in afternoon primary-care slots. Recommend a 48h reminder automation for that segment.', impact: InsightImpact.HIGH },
    { organizationId: orgId, title: 'Telehealth adoption up 37% MoM — primary care leading', body: 'Telehealth is 37% of visits, up from 27%. Satisfaction for telehealth (96%) now exceeds in-person (92%).', impact: InsightImpact.POSITIVE },
    { organizationId: orgId, title: 'Avg. discharge time 4.1hrs — 0.9hrs above benchmark', body: 'Bottlenecks at physician co-sign (48 min) and pharmacy reconciliation (62 min). Automating co-sign reminders could cut LOS ~55 min.', impact: InsightImpact.ATTENTION },
  ]});

  console.log('Seed complete. Login: admin@citymedical.org / ChangeMe123!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
