import { fromJson, toStringArray } from "@/lib/json-fields";

export function userRecord(row: any) {
  if (!row) return row;
  return {
    ...row,
    _id: row.id,
    smtpConfig: {
      host: row.smtpHost,
      port: row.smtpPort,
      username: row.smtpUsername,
      passwordEnc: row.smtpPasswordEnc,
      fromName: row.smtpFromName,
      fromEmail: row.smtpFromEmail,
      encryption: row.smtpEncryption,
      rejectUnauth: row.smtpRejectUnauth
    },
    smtpHealthLog: row.smtpHealthLogs ?? []
  };
}

export function emailRecord(row: any) {
  if (!row) return row;
  const to = toStringArray(row.toAddresses);
  const cc = toStringArray(row.ccAddresses);
  const bcc = toStringArray(row.bccAddresses);
  return {
    ...row,
    _id: row.id,
    to,
    cc,
    bcc,
    toAddresses: to,
    ccAddresses: cc,
    bccAddresses: bcc,
    attachments: fromJson(row.attachments, []),
    mergeData: fromJson(row.mergeData, null),
    retryHistory: fromJson(row.retryHistory, []),
    userId: row.user ? userRecord(row.user) : row.userId
  };
}

export function draftRecord(row: any) {
  if (!row) return row;
  const to = toStringArray(row.toAddresses);
  const cc = toStringArray(row.ccAddresses);
  const bcc = toStringArray(row.bccAddresses);
  return {
    ...row,
    _id: row.id,
    to,
    cc,
    bcc,
    toAddresses: to,
    ccAddresses: cc,
    bccAddresses: bcc,
    attachments: fromJson(row.attachments, [])
  };
}

export function templateRecord(row: any) {
  if (!row) return row;
  return {
    ...row,
    _id: row.id,
    subject: row.subjectLine,
    mergeFields: fromJson(row.mergeFields, [])
  };
}

export function scheduledRecord(row: any) {
  if (!row) return row;
  const to = toStringArray(row.toAddresses);
  const cc = toStringArray(row.ccAddresses);
  const bcc = toStringArray(row.bccAddresses);
  return {
    ...row,
    _id: row.id,
    to,
    cc,
    bcc,
    toAddresses: to,
    ccAddresses: cc,
    bccAddresses: bcc,
    attachments: fromJson(row.attachments, [])
  };
}

export function auditRecord(row: any) {
  if (!row) return row;
  return {
    ...row,
    _id: row.id,
    metadata: fromJson(row.metadata, {})
  };
}

export function announcementRecord(row: any) {
  if (!row) return row;
  return {
    ...row,
    _id: row.id,
    createdBy: row.createdById,
    dismissedBy: row.dismissals?.map((item: any) => item.userId) ?? []
  };
}
