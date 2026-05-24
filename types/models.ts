export interface UserRecord {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'admin' | 'user'
  isActive: boolean
  forcePasswordReset: boolean
  dailyLimit: number
  monthlyLimit: number
  smtpHost?: string | null
  smtpPort?: number | null
  smtpUsername?: string | null
  smtpPasswordEnc?: string | null
  smtpFromName?: string | null
  smtpFromEmail?: string | null
  smtpEncryption?: string | null
  smtpRejectUnauth: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SmtpConfig {
  host: string
  port: number
  username: string
  passwordEnc: string
  fromName: string
  fromEmail: string
  encryption: 'TLS' | 'SSL' | 'NONE'
  rejectUnauth: boolean
}

export interface EmailRecord {
  id: string
  userId: string
  toAddresses: string[]
  ccAddresses?: string[]
  bccAddresses?: string[]
  replyTo?: string | null
  subject: string
  bodyHtml: string
  attachments?: AttachmentRecord[]
  status: 'sent' | 'failed' | 'partial'
  errorMsg?: string | null
  isBulk: boolean
  sentAt: Date
  templateId?: string | null
  templateName?: string | null
  mergeData?: Record<string, string> | null
  retryCount: number
  retryHistory?: RetryAttempt[]
  acknowledged: boolean
  trackingEnabled: boolean
  openCount: number
  clickCount: number
  firstOpenedAt?: Date | null
  lastOpenedAt?: Date | null
}

export interface AttachmentRecord {
  name: string
  size: number
  mimeType: string
  path: string
}

export interface RetryAttempt {
  attemptedAt: string
  success: boolean
  error?: string
}

export interface DraftRecord {
  id: string
  userId: string
  toAddresses?: string[]
  ccAddresses?: string[]
  bccAddresses?: string[]
  replyTo?: string | null
  subject?: string | null
  bodyHtml?: string | null
  attachments?: AttachmentRecord[]
  createdAt: Date
  updatedAt: Date
}

export interface TemplateRecord {
  id: string
  userId: string
  name: string
  description?: string | null
  subjectLine: string
  bodyHtml: string
  mergeFields?: string[]
  previewImage?: string | null
  uploadMethod: 'file' | 'paste'
  isHtml: boolean
  isFavourite: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ScheduledEmailRecord {
  id: string
  userId: string
  toAddresses: string[]
  ccAddresses?: string[]
  bccAddresses?: string[]
  replyTo?: string | null
  subject: string
  bodyHtml: string
  attachments?: AttachmentRecord[]
  scheduledAt: Date
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'missed'
  sentAt?: Date | null
  errorMsg?: string | null
  retryCount: number
  createdAt: Date
  updatedAt: Date
}

export interface AuditLogRecord {
  id: string
  action: string
  category: 'AUTH' | 'EMAIL' | 'ADMIN'
  userId: string
  userName: string
  targetId?: string | null
  targetName?: string | null
  metadata?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
  createdAt: Date
}

export interface AnnouncementRecord {
  id: string
  message: string
  type: 'info' | 'warning' | 'critical'
  isActive: boolean
  createdById: string
  expiresAt?: Date | null
  createdAt: Date
}

export interface EmailEventRecord {
  id: string
  emailId: string
  userId: string
  type: 'open' | 'click'
  url?: string | null
  ip?: string | null
  userAgent?: string | null
  timestamp: Date
}

export interface SystemConfigRecord {
  id: string
  globalSmtpActive: boolean
  smtpHost?: string | null
  smtpPort?: number | null
  smtpUsername?: string | null
  smtpPasswordEnc?: string | null
  smtpFromName?: string | null
  smtpFromEmail?: string | null
  smtpEncryption?: string | null
  smtpRejectUnauth: boolean
  updatedAt: Date
  updatedById?: string | null
}
