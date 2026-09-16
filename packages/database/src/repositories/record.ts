import type { PaginatedResult, Record } from '@weight/shared/types/index';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { DatabaseInstance } from '../index.js';
import { materials, records, settings, vehicles } from '../schema/index.js';
import { nowIso } from '../timestamps.js';
import { getOrCreateMaterial } from './materials.js';
import { getOrCreateVehicle } from './vehicles.js';

function getNextTicketId(db: DatabaseInstance): string {
  const row = db
    .select({
      ticketPrefix: settings.ticketPrefix,
      nextTicketNumber: settings.nextTicketNumber,
    })
    .from(settings)
    .where(eq(settings.id, 1))
    .get();

  const prefix = row?.ticketPrefix || 'SRW';
  const number = row?.nextTicketNumber || 1;

  const ticketId = `${prefix}-${String(number).padStart(4, '0')}`;

  db.update(settings)
    .set({ nextTicketNumber: number + 1 })
    .where(eq(settings.id, 1))
    .run();

  return ticketId;
}

export interface CreateRecordInput {
  operator?: string | null;
  operationType: 'single' | 'double';
  grossWeight?: number | null;
  tareWeight?: number | null;
  netWeight?: number | null;
  status?: 'pending' | 'completed';
  vehicleName?: string | null;
  materialName?: string | null;
  supplierName?: string | null;
  customerName?: string | null;
  remark?: string | null;
  vehicleTareWeight?: number | null;
  vehicleTareUnit?: string | null;
}

export function createRecord(db: DatabaseInstance, data: CreateRecordInput): Record {
  let vehicleId: number | null = null;
  if (data.vehicleName) {
    vehicleId = getOrCreateVehicle(
      db,
      data.vehicleName,
      data.vehicleTareWeight,
      data.vehicleTareUnit,
    );
  }

  let materialId: number | null = null;
  if (data.materialName) {
    materialId = getOrCreateMaterial(db, data.materialName);
  }

  const ticketId = getNextTicketId(db);

  const timestamp = nowIso();
  const result = db
    .insert(records)
    .values({
      ticketId,
      operator: data.operator ?? null,
      operationType: data.operationType,
      grossWeight: data.grossWeight ?? null,
      tareWeight: data.tareWeight ?? null,
      netWeight: data.netWeight ?? null,
      status: data.status || 'pending',
      vehicleId,
      materialId,
      supplierName: data.supplierName ?? null,
      customerName: data.customerName ?? null,
      remark: data.remark ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning()
    .get();

  return result as Record;
}

export interface UpdateRecordInput {
  operator?: string | null;
  operationType?: 'single' | 'double';
  grossWeight?: number | null;
  tareWeight?: number | null;
  netWeight?: number | null;
  status?: 'pending' | 'completed';
  vehicleName?: string | null;
  materialName?: string | null;
  supplierName?: string | null;
  customerName?: string | null;
  remark?: string | null;
  vehicleTareWeight?: number | null;
  vehicleTareUnit?: string | null;
  vehicleId?: number | null;
  materialId?: number | null;
  updatedAt?: string;
}

export function updateRecord(
  db: DatabaseInstance,
  id: number,
  data: UpdateRecordInput,
): Record | null {
  let vehicleId: number | undefined;
  if (data.vehicleName) {
    vehicleId = getOrCreateVehicle(
      db,
      data.vehicleName,
      data.vehicleTareWeight,
      data.vehicleTareUnit,
    );
  }

  let materialId: number | undefined;
  if (data.materialName) {
    materialId = getOrCreateMaterial(db, data.materialName);
  }

  const updateData: UpdateRecordInput = { ...data };
  delete updateData.vehicleName;
  delete updateData.materialName;
  delete updateData.vehicleTareWeight;

  if (vehicleId !== undefined) updateData.vehicleId = vehicleId;
  if (materialId !== undefined) updateData.materialId = materialId;

  updateData.updatedAt = nowIso();

  const result = db.update(records).set(updateData).where(eq(records.id, id)).returning().get();

  return result as Record;
}

const recordSelect = {
  id: records.id,
  ticketId: records.ticketId,
  operator: records.operator,
  operationType: records.operationType,
  grossWeight: records.grossWeight,
  tareWeight: records.tareWeight,
  netWeight: records.netWeight,
  status: records.status,
  vehicleId: records.vehicleId,
  materialId: records.materialId,
  supplierName: records.supplierName,
  customerName: records.customerName,
  remark: records.remark,
  createdAt: records.createdAt,
  updatedAt: records.updatedAt,
  vehicleName: vehicles.name,
  materialName: materials.name,
};

export function getRecordById(db: DatabaseInstance, id: number): Record | null {
  const result =
    db
      .select(recordSelect)
      .from(records)
      .leftJoin(vehicles, eq(records.vehicleId, vehicles.id))
      .leftJoin(materials, eq(records.materialId, materials.id))
      .where(eq(records.id, id))
      .get() ?? null;

  return result as Record;
}

export function getRecordByTicketId(db: DatabaseInstance, ticketId: string): Record | null {
  const result =
    db
      .select(recordSelect)
      .from(records)
      .leftJoin(vehicles, eq(records.vehicleId, vehicles.id))
      .leftJoin(materials, eq(records.materialId, materials.id))
      .where(eq(records.ticketId, ticketId))
      .get() ?? null;

  return result as Record;
}

export type RecordStatus = 'pending' | 'completed';
export type RecordOperationType = 'single' | 'double';

export interface RecordFilters {
  status?: RecordStatus | RecordStatus[];
  operationType?: RecordOperationType | RecordOperationType[];
  vehicleName?: string;
  materialName?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

function asStringList(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function buildRecordFilterConditions(filters?: RecordFilters) {
  const conditions = [];

  const statuses = asStringList(filters?.status) as RecordStatus[];
  if (statuses.length === 1) {
    conditions.push(eq(records.status, statuses[0]));
  } else if (statuses.length > 1) {
    conditions.push(inArray(records.status, statuses));
  }

  const operationTypes = asStringList(filters?.operationType) as RecordOperationType[];
  if (operationTypes.length === 1) {
    conditions.push(eq(records.operationType, operationTypes[0]));
  } else if (operationTypes.length > 1) {
    conditions.push(inArray(records.operationType, operationTypes));
  }

  if (filters?.vehicleName) {
    conditions.push(sql`${vehicles.name} LIKE ${`%${filters.vehicleName}%`}`);
  }
  if (filters?.materialName) {
    conditions.push(sql`${materials.name} LIKE ${`%${filters.materialName}%`}`);
  }
  if (filters?.search) {
    conditions.push(
      sql`(${records.ticketId} LIKE ${`%${filters.search}%`} OR ${records.operator} LIKE ${`%${filters.search}%`} OR ${records.supplierName} LIKE ${`%${filters.search}%`} OR ${records.customerName} LIKE ${`%${filters.search}%`} OR ${vehicles.name} LIKE ${`%${filters.search}%`} OR ${materials.name} LIKE ${`%${filters.search}%`})`,
    );
  }
  if (filters?.startDate) {
    conditions.push(sql`${records.createdAt} >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    conditions.push(sql`${records.createdAt} <= ${filters.endDate}`);
  }

  return conditions;
}

function filtersNeedNameJoins(filters?: RecordFilters): boolean {
  return Boolean(filters?.search || filters?.vehicleName || filters?.materialName);
}

export function getRecordsPaginated(
  db: DatabaseInstance,
  page: number,
  pageSize: number,
  filters?: RecordFilters,
): PaginatedResult<Record> {
  const offset = (page - 1) * pageSize;
  const conditions = buildRecordFilterConditions(filters);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = db
    .select(recordSelect)
    .from(records)
    .leftJoin(vehicles, eq(records.vehicleId, vehicles.id))
    .leftJoin(materials, eq(records.materialId, materials.id))
    .where(whereClause)
    .orderBy(desc(records.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all();

  const totalQuery = filtersNeedNameJoins(filters)
    ? db
        .select({ count: count() })
        .from(records)
        .leftJoin(vehicles, eq(records.vehicleId, vehicles.id))
        .leftJoin(materials, eq(records.materialId, materials.id))
        .where(whereClause)
        .get()
    : db.select({ count: count() }).from(records).where(whereClause).get();

  const total = totalQuery?.count ?? 0;

  return { data: data as Record[], total, page, pageSize };
}

export function deleteRecord(db: DatabaseInstance, id: number): Record | null {
  const result = db.delete(records).where(eq(records.id, id)).returning().get();
  return result as Record;
}

export function deleteRecords(db: DatabaseInstance, ids: number[]): number {
  const result = db.delete(records).where(inArray(records.id, ids)).returning().all();
  return result.length;
}
