import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fromJson, toJson, toStringArray } from "@/lib/json-fields";

type ModelName =
  | "user"
  | "email"
  | "draft"
  | "template"
  | "scheduledEmail"
  | "auditLog"
  | "announcement"
  | "emailEvent"
  | "systemConfig";

type SortValue = 1 | -1;
type SortSpec = Record<string, SortValue>;

export async function connectToDatabase() {
  return prisma;
}

function delegate(model: ModelName): any {
  return (prisma as any)[model];
}

function keyFor(key: string) {
  if (key === "_id") return "id";
  if (key === "createdBy") return "createdById";
  return key;
}

function valueFor(value: any): any {
  if (value instanceof RegExp) {
    return { contains: value.source, mode: "insensitive" };
  }
  if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
    if ("$exists" in value && Object.keys(value).length === 1) {
      return value.$exists ? { not: null } : null;
    }
    if ("$gte" in value || "$gt" in value || "$lte" in value || "$lt" in value || "$ne" in value) {
      const mapped: Record<string, unknown> = {};
      if ("$gte" in value) mapped.gte = value.$gte;
      if ("$gt" in value) mapped.gt = value.$gt;
      if ("$lte" in value) mapped.lte = value.$lte;
      if ("$lt" in value) mapped.lt = value.$lt;
      if ("$ne" in value) mapped.not = value.$ne;
      return mapped;
    }
  }
  return value;
}

function whereFor(filter: any = {}): any {
  const where: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of Object.entries(filter ?? {})) {
    if (rawKey === "$or" && Array.isArray(rawValue)) {
      where.OR = rawValue.map((item) => whereFor(item));
      continue;
    }
    if (rawKey === "$and" && Array.isArray(rawValue)) {
      where.AND = rawValue.map((item) => whereFor(item));
      continue;
    }
    if (rawKey === "dismissedBy" && rawValue && typeof rawValue === "object" && "$ne" in rawValue) {
      where.dismissals = { none: { userId: String((rawValue as any).$ne) } };
      continue;
    }
    const key = keyFor(rawKey);
    where[key] = valueFor(rawValue);
  }
  return where;
}

function orderByFor(sort?: SortSpec): any {
  if (!sort) return undefined;
  return Object.entries(sort).map(([key, value]) => ({ [keyFor(key)]: value === -1 ? "desc" : "asc" }));
}

function selectFor(select?: string): any {
  if (!select) return undefined;
  const fields = select.split(/\s+/).filter(Boolean);
  if (!fields.length) return undefined;
  if (fields.every((field) => field.startsWith("-"))) {
    return undefined;
  }
  return Object.fromEntries(fields.map((field) => [keyFor(field), true]));
}

function applySelect(row: any, select?: string) {
  if (!row || !select) return row;
  const fields = select.split(/\s+/).filter(Boolean);
  if (!fields.length) return row;
  const clone = { ...row };
  for (const field of fields) {
    if (field.startsWith("-")) {
      const path = field.slice(1).split(".").map(keyFor);
      if (path.length === 1) {
        delete clone[path[0]];
      } else {
        let target = clone;
        for (const part of path.slice(0, -1)) target = target?.[part];
        if (target) delete target[path.at(-1)!];
      }
    }
  }
  return clone;
}

function userData(data: any) {
  const smtp = data.smtpConfig ?? {};
  return {
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    isActive: data.isActive,
    forcePasswordReset: data.forcePasswordReset,
    dailyLimit: data.dailyLimit,
    monthlyLimit: data.monthlyLimit,
    smtpHost: data.smtpHost ?? smtp.host,
    smtpPort: data.smtpPort ?? smtp.port,
    smtpUsername: data.smtpUsername ?? smtp.username,
    smtpPasswordEnc: data.smtpPasswordEnc ?? smtp.passwordEnc,
    smtpFromName: data.smtpFromName ?? smtp.fromName,
    smtpFromEmail: data.smtpFromEmail ?? smtp.fromEmail,
    smtpEncryption: data.smtpEncryption ?? smtp.encryption,
    smtpRejectUnauth: data.smtpRejectUnauth ?? smtp.rejectUnauth
  };
}

function emailData(data: any) {
  return {
    userId: String(data.userId),
    toAddresses: toJson(data.toAddresses ?? data.to ?? [])!,
    ccAddresses: toJson(data.ccAddresses ?? data.cc),
    bccAddresses: toJson(data.bccAddresses ?? data.bcc),
    replyTo: data.replyTo,
    subject: data.subject,
    bodyHtml: data.bodyHtml,
    attachments: toJson(data.attachments),
    status: data.status,
    errorMsg: data.errorMsg,
    isBulk: data.isBulk,
    sentAt: data.sentAt,
    templateId: data.templateId,
    templateName: data.templateName,
    mergeData: toJson(data.mergeData),
    retryCount: data.retryCount,
    retryHistory: toJson(data.retryHistory),
    acknowledged: data.acknowledged,
    trackingEnabled: data.trackingEnabled,
    openCount: data.openCount,
    clickCount: data.clickCount,
    firstOpenedAt: data.firstOpenedAt,
    lastOpenedAt: data.lastOpenedAt
  };
}

function draftData(data: any) {
  return {
    userId: String(data.userId),
    toAddresses: toJson(data.toAddresses),
    ccAddresses: toJson(data.ccAddresses),
    bccAddresses: toJson(data.bccAddresses),
    replyTo: data.replyTo,
    subject: data.subject,
    bodyHtml: data.bodyHtml,
    attachments: toJson(data.attachments)
  };
}

function templateData(data: any) {
  return {
    userId: String(data.userId),
    name: data.name,
    description: data.description,
    subjectLine: data.subjectLine,
    bodyHtml: data.bodyHtml,
    mergeFields: toJson(data.mergeFields),
    previewImage: data.previewImage,
    uploadMethod: data.uploadMethod,
    isHtml: data.isHtml,
    isFavourite: data.isFavourite
  };
}

function scheduledData(data: any) {
  return {
    userId: String(data.userId),
    toAddresses: toJson(data.toAddresses ?? data.to ?? [])!,
    ccAddresses: toJson(data.ccAddresses ?? data.cc),
    bccAddresses: toJson(data.bccAddresses ?? data.bcc),
    replyTo: data.replyTo,
    subject: data.subject,
    bodyHtml: data.bodyHtml,
    attachments: toJson(data.attachments),
    scheduledAt: data.scheduledAt,
    status: data.status,
    sentAt: data.sentAt,
    errorMsg: data.errorMsg,
    retryCount: data.retryCount
  };
}

function auditData(data: any) {
  return {
    action: data.action,
    category: data.category,
    userId: String(data.userId ?? ""),
    userName: data.userName ?? "",
    targetId: data.targetId ?? null,
    targetName: data.targetName,
    metadata: toJson(data.metadata),
    ip: data.ip,
    userAgent: data.userAgent,
    createdAt: data.createdAt
  };
}

function announcementData(data: any) {
  return {
    message: data.message,
    type: data.type,
    isActive: data.isActive,
    createdById: data.createdById || data.createdBy ? String(data.createdById ?? data.createdBy) : undefined,
    expiresAt: data.expiresAt
  };
}

function eventData(data: any) {
  return {
    emailId: String(data.emailId),
    userId: String(data.userId),
    type: data.type,
    url: data.url,
    ip: data.ip,
    userAgent: data.userAgent,
    timestamp: data.timestamp
  };
}

function systemConfigData(data: any) {
  const smtp = data.globalSmtp ?? {};
  return {
    id: "singleton",
    globalSmtpActive: data.globalSmtpActive,
    smtpHost: data.smtpHost ?? smtp.host,
    smtpPort: data.smtpPort ?? smtp.port,
    smtpUsername: data.smtpUsername ?? smtp.username,
    smtpPasswordEnc: data.smtpPasswordEnc ?? smtp.passwordEnc,
    smtpFromName: data.smtpFromName ?? smtp.fromName,
    smtpFromEmail: data.smtpFromEmail ?? smtp.fromEmail,
    smtpEncryption: data.smtpEncryption ?? smtp.encryption,
    smtpRejectUnauth: data.smtpRejectUnauth ?? smtp.rejectUnauth,
    updatedById: data.updatedById
  };
}

function dataFor(model: ModelName, data: any) {
  const cleaned =
    model === "user"
      ? userData(data)
      : model === "email"
        ? emailData(data)
        : model === "draft"
          ? draftData(data)
          : model === "template"
            ? templateData(data)
            : model === "scheduledEmail"
              ? scheduledData(data)
              : model === "auditLog"
                ? auditData(data)
                : model === "announcement"
                  ? announcementData(data)
                  : model === "emailEvent"
                    ? eventData(data)
                    : systemConfigData(data);
  return Object.fromEntries(Object.entries(cleaned).filter(([, value]) => value !== undefined));
}

function normalize(model: ModelName, row: any, lean = false): any {
  if (!row) return row;
  const base = { ...row, _id: row.id };
  if (model === "user") {
    base.smtpConfig = {
      host: row.smtpHost,
      port: row.smtpPort,
      username: row.smtpUsername,
      passwordEnc: row.smtpPasswordEnc,
      fromName: row.smtpFromName,
      fromEmail: row.smtpFromEmail,
      encryption: row.smtpEncryption,
      rejectUnauth: row.smtpRejectUnauth
    };
    base.smtpHealthLog = row.smtpHealthLogs ?? [];
  }
  if (model === "email") {
    base.toAddresses = toStringArray(row.toAddresses);
    base.ccAddresses = toStringArray(row.ccAddresses);
    base.bccAddresses = toStringArray(row.bccAddresses);
    base.to = base.toAddresses;
    base.cc = base.ccAddresses;
    base.bcc = base.bccAddresses;
    base.attachments = fromJson(row.attachments, []);
    base.mergeData = fromJson(row.mergeData, null);
    base.retryHistory = fromJson(row.retryHistory, []);
  }
  if (model === "draft" || model === "scheduledEmail") {
    base.toAddresses = toStringArray(row.toAddresses);
    base.ccAddresses = toStringArray(row.ccAddresses);
    base.bccAddresses = toStringArray(row.bccAddresses);
    base.to = base.toAddresses;
    base.cc = base.ccAddresses;
    base.bcc = base.bccAddresses;
    base.attachments = fromJson(row.attachments, []);
  }
  if (model === "template") {
    base.mergeFields = fromJson(row.mergeFields, []);
    base.subject = row.subjectLine;
  }
  if (model === "auditLog") {
    base.metadata = fromJson(row.metadata, {});
  }
  if (model === "announcement") {
    base.createdBy = row.createdById;
    base.dismissedBy = row.dismissals?.map((item: any) => item.userId) ?? [];
  }
  if (model === "systemConfig") {
    base.globalSmtp = {
      host: row.smtpHost,
      port: row.smtpPort,
      username: row.smtpUsername,
      passwordEnc: row.smtpPasswordEnc,
      fromName: row.smtpFromName,
      fromEmail: row.smtpFromEmail,
      encryption: row.smtpEncryption,
      rejectUnauth: row.smtpRejectUnauth
    };
  }
  if (!lean) {
    Object.defineProperty(base, "save", {
      enumerable: false,
      value: async () => {
        const data = dataFor(model, base);
        const updated =
          model === "systemConfig"
            ? await delegate(model).upsert({
                where: { id: "singleton" },
                update: data,
                create: data
              })
            : await delegate(model).update({
                where: { id: base.id },
                data
              });
        return normalize(model, updated);
      }
    });
  }
  return base;
}

class QueryBuilder implements PromiseLike<any> {
  private sortSpec?: SortSpec;
  private take?: number;
  private leanResult = false;
  private selectSpec?: string;
  private includeUser = false;

  constructor(
    private model: ModelName,
    private action: "findMany" | "findFirst" | "findUnique",
    private filter: any = {}
  ) {}

  sort(spec: SortSpec) {
    this.sortSpec = spec;
    return this;
  }

  limit(value: number) {
    this.take = value;
    return this;
  }

  select(value: string) {
    this.selectSpec = value;
    return this;
  }

  populate() {
    this.includeUser = true;
    return this;
  }

  lean() {
    this.leanResult = true;
    return this;
  }

  private async exec() {
    const args: any = {};
    if (this.action === "findUnique") {
      args.where = { id: String(this.filter) };
    } else {
      args.where = whereFor(this.filter);
    }
    const orderBy = orderByFor(this.sortSpec);
    if (orderBy) args.orderBy = orderBy;
    if (this.take) args.take = this.take;
    const select = selectFor(this.selectSpec);
    if (select) args.select = select;
    if (this.includeUser && this.model === "email") {
      args.include = { user: { select: { name: true, email: true } } };
    }
    if (this.model === "announcement") {
      args.include = { dismissals: true };
    }
    if (this.model === "user" && !select) {
      args.include = { smtpHealthLogs: { orderBy: { testedAt: "desc" }, take: 10 } };
    }
    const result = await delegate(this.model)[this.action](args);
    const normalized = Array.isArray(result)
      ? result.map((row) => normalize(this.model, row, this.leanResult))
      : normalize(this.model, result, this.leanResult);
    return Array.isArray(normalized)
      ? normalized.map((row) => applySelect(row, this.selectSpec))
      : applySelect(normalized, this.selectSpec);
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

function createModel(model: ModelName): any {
  function Model(data: any = {}) {
    return normalize(model, { id: model === "systemConfig" ? "singleton" : data.id, ...data });
  }

  Object.assign(Model, {
    find(filter: any = {}) {
      return new QueryBuilder(model, "findMany", filter);
    },
    findOne(filter: any = {}) {
      if (model === "systemConfig") return new QueryBuilder(model, "findUnique", "singleton");
      return new QueryBuilder(model, "findFirst", filter);
    },
    findById(id: string) {
      return new QueryBuilder(model, "findUnique", id);
    },
    async create(data: any) {
      const created = await delegate(model).create({ data: dataFor(model, data) });
      return normalize(model, created);
    },
    async findByIdAndUpdate(id: string, data: any) {
      const updated = await delegate(model).update({ where: { id }, data: dataFor(model, data) });
      return normalize(model, updated);
    },
    async findOneAndUpdate(filter: any, data: any) {
      const existing = await delegate(model).findFirst({ where: whereFor(filter) });
      if (!existing) return null;
      const updated = await delegate(model).update({ where: { id: existing.id }, data: dataFor(model, data) });
      return normalize(model, updated);
    },
    async countDocuments(filter: any = {}) {
      return delegate(model).count({ where: whereFor(filter) });
    },
    async updateOne(filter: any = {}, update: any = {}) {
      if (model === "announcement" && update.$push?.dismissedBy) {
        const announcement = await delegate(model).findFirst({ where: whereFor(filter) });
        if (announcement) {
          await prisma.announcementDismissal.upsert({
            where: {
              announcementId_userId: {
                announcementId: announcement.id,
                userId: String(update.$push.dismissedBy)
              }
            },
            update: {},
            create: { announcementId: announcement.id, userId: String(update.$push.dismissedBy) }
          });
        }
        return { modifiedCount: announcement ? 1 : 0 };
      }
      if (model === "user" && update.$push?.smtpHealthLog) {
        const user = await delegate(model).findFirst({ where: whereFor(filter) });
        if (user) {
          await prisma.smtpHealthLog.create({
            data: {
              userId: user.id,
              success: Boolean(update.$push.smtpHealthLog.success),
              latencyMs: update.$push.smtpHealthLog.latencyMs,
              error: update.$push.smtpHealthLog.error,
              testedAt: update.$push.smtpHealthLog.testedAt
            }
          });
        }
        return { modifiedCount: user ? 1 : 0 };
      }
      const existing = await delegate(model).findFirst({ where: whereFor(filter) });
      if (!existing) return { modifiedCount: 0 };
      const data = update.$set ? dataFor(model, update.$set) : dataFor(model, update);
      if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) {
          data[keyFor(key)] = { increment: value };
        }
      }
      const updated = await delegate(model).update({ where: { id: existing.id }, data });
      return normalize(model, updated);
    },
    async aggregate(pipeline: any[] = []) {
      if (model !== "email") return [];
      const match = pipeline.find((stage) => stage.$match)?.$match ?? {};
      const group = pipeline.find((stage) => stage.$group)?.$group ?? {};
      const sort = pipeline.find((stage) => stage.$sort)?.$sort;
      const limit = pipeline.find((stage) => stage.$limit)?.$limit;

      if (group._id === "$status") {
        const rows = await prisma.email.groupBy({
          by: ["status"],
          _count: { _all: true },
          where: whereFor(match)
        });
        return rows.map((row) => ({ _id: row.status, value: row._count._all }));
      }

      if (group._id === "$userId") {
        const rows = await prisma.email.groupBy({
          by: ["userId"],
          _count: { _all: true },
          where: whereFor(match.status ? match : { ...match, status: "sent" }),
          orderBy: sort?.sent ? { _count: { userId: sort.sent === -1 ? "desc" : "asc" } } : undefined,
          take: limit
        });
        const users = await prisma.user.findMany({
          where: { id: { in: rows.map((row) => row.userId) } },
          select: { id: true, name: true, email: true }
        });
        const userMap = new Map(users.map((user) => [user.id, user]));
        return rows.map((row) => ({
          _id: row.userId,
          sent: row._count._all,
          name: userMap.get(row.userId)?.name,
          email: userMap.get(row.userId)?.email
        }));
      }

      if (group._id === null && typeof group.total?.$sum === "string") {
        const field = group.total.$sum.slice(1) as "openCount" | "clickCount";
        const result = await prisma.email.aggregate({
          where: whereFor(match),
          _sum: { [field]: true }
        });
        return [{ _id: null, total: result._sum[field] ?? 0 }];
      }

      if (group._id?.day?.$dateToString && group._id?.status === "$status") {
        const where = whereFor(match);
        const rows = await prisma.$queryRaw<{ date: Date; status: string; count: bigint }[]>(Prisma.sql`
          SELECT DATE("sentAt") AS date, "status", COUNT(*) AS count
          FROM "Email"
          WHERE ${where.userId ? Prisma.sql`"userId" = ${where.userId} AND` : Prisma.empty}
            "sentAt" >= ${where.sentAt?.gte ?? new Date(0)}
          GROUP BY DATE("sentAt"), "status"
          ORDER BY DATE("sentAt") ASC
        `);
        return rows.map((row) => ({
          _id: { day: row.date.toISOString().slice(0, 10), status: row.status },
          count: Number(row.count)
        }));
      }

      if (group._id?.userId === "$userId" && group._id?.status === "$status") {
        const rows = await prisma.email.groupBy({
          by: ["userId", "status"],
          _count: { _all: true },
          where: whereFor(match)
        });
        const users = await prisma.user.findMany({
          where: { id: { in: rows.map((row) => row.userId) } },
          select: { id: true, name: true }
        });
        const userMap = new Map(users.map((user) => [user.id, user]));
        const byUser = new Map<string, { _id: string; name?: string; sent: number; failed: number }>();
        for (const row of rows) {
          const item = byUser.get(row.userId) ?? {
            _id: row.userId,
            name: userMap.get(row.userId)?.name,
            sent: 0,
            failed: 0
          };
          if (row.status === "sent") item.sent += row._count._all;
          if (row.status === "failed") item.failed += row._count._all;
          byUser.set(row.userId, item);
        }
        return Array.from(byUser.values()).sort((a, b) => b.sent - a.sent).slice(0, limit ?? 20);
      }

      return [];
    },
    async deleteMany(filter: any = {}) {
      return delegate(model).deleteMany({ where: whereFor(filter) });
    },
    async deleteOne(filter: any = {}) {
      return delegate(model).deleteMany({ where: whereFor(filter) });
    }
  });

  return Model;
}

export const User = createModel("user");
export const Email = createModel("email");
export const Draft = createModel("draft");
export const Template = createModel("template");
export const ScheduledEmail = createModel("scheduledEmail");
export const AuditLog = createModel("auditLog");
export const Announcement = createModel("announcement");
export const EmailEvent = createModel("emailEvent");
export const SystemConfig = createModel("systemConfig");
