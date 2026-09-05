export interface DocSubSection {
  id: string;
  title: string;
}

export interface DocSection {
  id: string;
  title: string;
  group: string;
  badge?: string;
  summary: string;
  subSections: DocSubSection[];
  keywords: string[];
}

export const DOC_GROUPS = [
  {
    name: "Getting Started",
    items: [
      { id: "overview", title: "Platform Overview", badge: "Core" },
      { id: "quickstart", title: "5-Minute Quickstart", badge: "Start" },
      { id: "architecture", title: "Architecture & BYO-SMTP", badge: "Design" }
    ]
  },
  {
    name: "Infrastructure & SMTP",
    items: [
      { id: "smtp-pool", title: "SMTP Server Pool & Failover", badge: "Crucial" },
      { id: "providers", title: "Provider Setup Guides", badge: "Guides" },
      { id: "health-latency", title: "Health Checks & Latency", badge: "Metrics" }
    ]
  },
  {
    name: "Dispatch Engine",
    items: [
      { id: "compose", title: "Campaign Composer", badge: "Send" },
      { id: "bulk", title: "Bulk CSV Campaigns", badge: "Batch" },
      { id: "preflight", title: "Pre-flight MX & Validation", badge: "Quality" },
      { id: "scheduled", title: "Scheduled Queue & Cron", badge: "Queue" }
    ]
  },
  {
    name: "Studio & Content",
    items: [
      { id: "templates", title: "HTML & Visual Templates", badge: "Design" },
      { id: "variables", title: "Merge Tags & Variables", badge: "Syntax" },
      { id: "click-tracking", title: "Click Tracking & Buttons", badge: "Tracking" },
      { id: "certificates", title: "Certificate Studio (PDF)", badge: "New" }
    ]
  },
  {
    name: "Dynamic QR & Gate Scanner",
    items: [
      { id: "qr-engine", title: "Dynamic QR Generation", badge: "Security" },
      { id: "operator-pwa", title: "Operator Mobile PWA", badge: "Mobile" },
      { id: "gate-checkin", title: "Gate Check-in & Offline", badge: "PWA" }
    ]
  },
  {
    name: "Observability & Logs",
    items: [
      { id: "telemetry", title: "Real-time Telemetry Dashboard", badge: "Live" },
      { id: "sse-stream", title: "SSE Live Log Stream", badge: "Realtime" },
      { id: "dlq-retry", title: "Dead-Letter Queue & Retries", badge: "Reliability" },
      { id: "analytics", title: "Open/Click Analytics & Bot Filter", badge: "Analytics" }
    ]
  },
  {
    name: "Security & Governance",
    items: [
      { id: "rbac-roles", title: "Access Control & Roles", badge: "Security" },
      { id: "quotas", title: "Send Quotas & Rate Limits", badge: "Limits" },
      { id: "audit-anomalies", title: "Audit Trail & Anomaly Engine", badge: "Compliance" },
      { id: "domain-analytics", title: "Domain & ISP Analytics", badge: "Insights" },
      { id: "announcements-push", title: "Announcements & Web Push", badge: "Broadcast" }
    ]
  },
  {
    name: "Developer API Reference",
    items: [
      { id: "api-auth", title: "Authentication & Conventions", badge: "REST" },
      { id: "api-send", title: "Send & Bulk Send Endpoints", badge: "API" },
      { id: "api-schedule", title: "Schedule & Queue Endpoints", badge: "API" },
      { id: "api-qr-operator", title: "QR & Operator Check-in API", badge: "API" },
      { id: "api-stats", title: "Telemetry & Stats API", badge: "API" }
    ]
  },
  {
    name: "Production Guides",
    items: [
      { id: "deliverability", title: "DKIM, SPF & DMARC Setup", badge: "Must-Know" },
      { id: "smtp-errors", title: "SMTP Error Dictionary (535, 550)", badge: "Debug" },
      { id: "ip-warmup", title: "High-Volume IP Warm-up Ramp", badge: "Strategy" }
    ]
  }
];

export const DOC_SECTIONS_DATA: Record<string, DocSection> = {
  "overview": {
    id: "overview",
    title: "Platform Overview",
    group: "Getting Started",
    badge: "Core",
    summary: "High-performance self-hosted mail engine and campaign platform built for maximum deliverability and complete infrastructure control.",
    keywords: ["overview", "introduction", "postly", "architecture", "byo-smtp", "self-hosted", "email engine", "dispatch"],
    subSections: [
      { id: "what-is-postly", title: "What is Postly?" },
      { id: "core-pillars", title: "Core Platform Pillars" },
      { id: "why-byo-smtp", title: "Why Bring-Your-Own-SMTP?" },
      { id: "security-guarantees", title: "Security & Privacy Model" }
    ]
  },
  "quickstart": {
    id: "quickstart",
    title: "5-Minute Quickstart",
    group: "Getting Started",
    badge: "Start",
    summary: "Step-by-step walkthrough to get your first SMTP relay connected, craft a template, and dispatch your first verified test email.",
    keywords: ["quickstart", "setup", "getting started", "first email", "test send", "tutorial"],
    subSections: [
      { id: "step-1-account", title: "1. Account Provisioning" },
      { id: "step-2-smtp", title: "2. Connecting Your First Relay" },
      { id: "step-3-template", title: "3. Creating a Test Template" },
      { id: "step-4-dispatch", title: "4. Executing Your First Send" },
      { id: "step-5-telemetry", title: "5. Inspecting Delivery Telemetry" }
    ]
  },
  "architecture": {
    id: "architecture",
    title: "Architecture & BYO-SMTP",
    group: "Getting Started",
    badge: "Design",
    summary: "Technical architecture of Postly v2.5: Next.js 14 App Router, PostgreSQL / Prisma ORM, Server-Sent Events, and client-to-relay streaming.",
    keywords: ["architecture", "byo-smtp", "system design", "database", "prisma", "nextjs", "relay", "scalability"],
    subSections: [
      { id: "system-architecture-diagram", title: "System Architecture Flow" },
      { id: "byo-smtp-concept", title: "The BYO-SMTP Isolation Model" },
      { id: "storage-database", title: "Database & Schema Layout" },
      { id: "worker-dispatch-pipeline", title: "Worker Dispatch Pipeline" }
    ]
  },
  "smtp-pool": {
    id: "smtp-pool",
    title: "SMTP Server Pool & Failover",
    group: "Infrastructure & SMTP",
    badge: "Crucial",
    summary: "Configure multiple SMTP relays with automatic primary-to-fallback failover, circuit breakers, and zero dropped emails during provider outages.",
    keywords: ["smtp pool", "fallback", "failover", "primary", "secondary", "circuit breaker", "retry", "relay", "cluster"],
    subSections: [
      { id: "pool-concept", title: "Pool Architecture & Dual Roles" },
      { id: "failover-triggers", title: "Automatic Failover Triggers" },
      { id: "interactive-failover-demo", title: "Interactive Failover Demonstration" },
      { id: "pool-management-ui", title: "Managing Server Entries in Settings" },
      { id: "fallback-audit-trail", title: "Fallback Logging & Audit Inspection" }
    ]
  },
  "providers": {
    id: "providers",
    title: "Provider Setup Guides",
    group: "Infrastructure & SMTP",
    badge: "Guides",
    summary: "Detailed, battle-tested configuration recipes for Gmail/Google Workspace, Amazon SES, ZeptoMail, SendGrid, and Custom Postfix relays.",
    keywords: ["providers", "gmail", "app password", "amazon ses", "zeptomail", "sendgrid", "postfix", "tls", "ports", "credentials"],
    subSections: [
      { id: "provider-gmail", title: "Google Workspace & Gmail (App Passwords)" },
      { id: "provider-ses", title: "Amazon Simple Email Service (SES)" },
      { id: "provider-zeptomail", title: "Zoho ZeptoMail" },
      { id: "provider-sendgrid", title: "SendGrid / Twilio" },
      { id: "provider-custom-postfix", title: "Custom Postfix / Local SMTP" }
    ]
  },
  "health-latency": {
    id: "health-latency",
    title: "Health Checks & Latency",
    group: "Infrastructure & SMTP",
    badge: "Metrics",
    summary: "Automated handshake verification, latency benchmarking, historical connection logs, and SSL/TLS certificate validity checks.",
    keywords: ["health check", "latency", "handshake", "ping", "ssl", "tls", "connection pool", "round trip time"],
    subSections: [
      { id: "handshake-procedure", title: "The 4-Way SMTP Handshake Test" },
      { id: "latency-thresholds", title: "Latency Benchmarks & SLOs" },
      { id: "historical-logs", title: "Analyzing Health History" }
    ]
  },
  "compose": {
    id: "compose",
    title: "Campaign Composer",
    group: "Dispatch Engine",
    badge: "Send",
    summary: "Interactive single-message dispatcher with live WYSIWYG/HTML editing, variable auto-completion, attachments, and delivery options.",
    keywords: ["compose", "single send", "attachments", "wysiwyg", "merge tags", "preview", "dispatch"],
    subSections: [
      { id: "composer-features", title: "Composer Capabilities" },
      { id: "variable-prompting", title: "Dynamic Variable Detection" },
      { id: "attachments-handling", title: "File Attachments & Size Limits" },
      { id: "pre-send-test", title: "Test Send Mode" }
    ]
  },
  "bulk": {
    id: "bulk",
    title: "Bulk CSV Campaigns",
    group: "Dispatch Engine",
    badge: "Batch",
    summary: "High-throughput CSV campaign pipeline: stream parsing, auto-header mapping, batch concurrency, rate throttling, and pause/resume.",
    keywords: ["bulk send", "csv upload", "batching", "campaigns", "concurrency", "rate limiting", "throttling"],
    subSections: [
      { id: "csv-format-rules", title: "CSV Header & Data Requirements" },
      { id: "batch-processing-stream", title: "Streaming & Concurrency Engine" },
      { id: "rate-throttling", title: "Throughput Throttling & Delay Profiles" },
      { id: "progress-tracking", title: "Real-Time Job Monitoring" }
    ]
  },
  "preflight": {
    id: "preflight",
    title: "Pre-flight MX & Validation",
    group: "Dispatch Engine",
    badge: "Quality",
    summary: "Protect your sender reputation with automated RFC 5322 regex checks, DNS MX record validation, deduplication, and suppression list filtering.",
    keywords: ["preflight", "validation", "mx lookup", "dns", "rfc 5322", "deduplication", "bounce prevention", "reputation"],
    subSections: [
      { id: "validation-pipeline", title: "The 4-Tier Validation Pipeline" },
      { id: "mx-dns-checks", title: "Live DNS MX Resolution" },
      { id: "dedup-engine", title: "Automated Deduplication" },
      { id: "syntax-quarantine", title: "Syntax Error Quarantine" }
    ]
  },
  "scheduled": {
    id: "scheduled",
    title: "Scheduled Queue & Cron",
    group: "Dispatch Engine",
    badge: "Queue",
    summary: "Timezone-aware scheduling engine with transactional state transitions, cron processing worker, and missed-window recovery.",
    keywords: ["scheduled", "cron", "queue", "delay send", "timezone", "worker", "automation"],
    subSections: [
      { id: "scheduling-workflow", title: "Scheduling Lifecycle" },
      { id: "cron-runner", title: "The Background Cron Runner" },
      { id: "queue-states", title: "State Machine: Pending to Sent" },
      { id: "cancel-reschedule", title: "Cancellation & Edit Policies" }
    ]
  },
  "templates": {
    id: "templates",
    title: "HTML & Visual Templates",
    group: "Studio & Content",
    badge: "Design",
    summary: "Template Studio featuring TipTap visual WYSIWYG, CodeMirror HTML code editor, responsive device previews, and email client compatibility.",
    keywords: ["templates", "html", "wysiwyg", "tiptap", "codemirror", "responsive", "preview", "email styling"],
    subSections: [
      { id: "editor-modes", title: "Dual Editor Modes: Visual vs HTML" },
      { id: "email-client-compat", title: "Email Client Rendering Rules" },
      { id: "responsive-preview", title: "Mobile vs Desktop Live Preview" },
      { id: "template-management", title: "Favorites, Search & Cloning" }
    ]
  },
  "variables": {
    id: "variables",
    title: "Merge Tags & Variables",
    group: "Studio & Content",
    badge: "Syntax",
    summary: "Comprehensive reference for Postly variable syntax: standard merge fields, fallback values, system tags, and dynamic image embeds.",
    keywords: ["variables", "merge tags", "handlebars", "placeholders", "syntax", "dynamic content", "cheat sheet"],
    subSections: [
      { id: "variable-syntax", title: "Variable Syntax & Notation" },
      { id: "reserved-system-tags", title: "Reserved System Tags" },
      { id: "fallback-values", title: "Default & Fallback Values" },
      { id: "interactive-playground", title: "Interactive Merge Tag Playground" }
    ]
  },
  "click-tracking": {
    id: "click-tracking",
    title: "Click Tracking & Buttons",
    group: "Studio & Content",
    badge: "Tracking",
    summary: "High-engagement click tracking engine: tracked button builder, URL rewriting proxy, signed redirect tokens, and per-link analytics.",
    keywords: ["click tracking", "tracked url", "buttons", "redirect", "proxy", "link analytics", "engagement"],
    subSections: [
      { id: "how-tracking-works", title: "How Click Tracking Works" },
      { id: "button-builder-tag", title: "The {{TRACKED_URL}} Tag Format" },
      { id: "redirect-security", title: "Redirect Integrity & URL Signing" },
      { id: "click-attribution", title: "Per-Button Click Attribution" }
    ]
  },
  "certificates": {
    id: "certificates",
    title: "Certificate Studio (PDF)",
    group: "Studio & Content",
    badge: "New",
    summary: "Generate personalized vector PDF certificates at scale: coordinate-based text placement, custom fonts, dynamic QR verification badges, and automated email attachment.",
    keywords: ["certificates", "pdf generator", "canvas", "dynamic fields", "verification qr", "pdf-lib", "bulk attachments"],
    subSections: [
      { id: "certificate-studio-intro", title: "What is Certificate Studio?" },
      { id: "template-creation-steps", title: "Creating a Certificate Template" },
      { id: "field-coordinate-mapping", title: "Coordinate & Style Field Mapping" },
      { id: "bulk-certificate-generation", title: "Bulk PDF Generation & Attachment" },
      { id: "qr-verification-badge", title: "Embedding Dynamic QR Verification Badges" }
    ]
  },
  "qr-engine": {
    id: "qr-engine",
    title: "Dynamic QR Generation",
    group: "Dynamic QR & Gate Scanner",
    badge: "Security",
    summary: "Generate tamper-proof, dynamically branded QR codes for tickets, passes, vouchers, and secure authentication.",
    keywords: ["qr code", "dynamic qr", "hmac", "tamper proof", "branding", "logo overlay", "vector qr"],
    subSections: [
      { id: "dynamic-qr-overview", title: "Dynamic QR Architecture" },
      { id: "visual-customization", title: "Branding: Colors, Corners & Logos" },
      { id: "security-hmac", title: "HMAC Anti-Tampering Protection" },
      { id: "single-vs-multi-use", title: "Single-Use vs Multi-Use Scan Modes" }
    ]
  },
  "operator-pwa": {
    id: "operator-pwa",
    title: "Operator Mobile PWA",
    group: "Dynamic QR & Gate Scanner",
    badge: "Mobile",
    summary: "Mobile-first Progressive Web App at /operator designed for on-site gate staff with PIN authentication, camera scanner, and haptic feedback.",
    keywords: ["operator", "pwa", "mobile app", "gate staff", "camera scanner", "pin auth", "html5-qrcode"],
    subSections: [
      { id: "pwa-features", title: "PWA Operator Experience" },
      { id: "operator-provisioning", title: "Creating Operator Accounts & PINs" },
      { id: "camera-scanner-engine", title: "Hardware Camera Scanner Engine" },
      { id: "sound-haptic-feedback", title: "Audio & Haptic Scan Verification" }
    ]
  },
  "gate-checkin": {
    id: "gate-checkin",
    title: "Gate Check-in & Offline",
    group: "Dynamic QR & Gate Scanner",
    badge: "PWA",
    summary: "Zero-latency gate admittance with offline IndexedDB queue, conflict resolution, double-scan prevention, and attendee metadata popups.",
    keywords: ["gate checkin", "offline sync", "indexeddb", "service worker", "admittance", "double-scan prevention"],
    subSections: [
      { id: "checkin-states", title: "Scan Verification Outcomes" },
      { id: "offline-queue-sync", title: "Offline IndexedDB Sync Pipeline" },
      { id: "conflict-resolution", title: "Conflict Resolution & Audit Stamps" },
      { id: "attendee-metadata-card", title: "Displaying Custom Attendee Metadata" }
    ]
  },
  "telemetry": {
    id: "telemetry",
    title: "Real-time Telemetry Dashboard",
    group: "Observability & Logs",
    badge: "Live",
    summary: "High-frequency operational cockpit at /monitor: live dispatch graphs, delivery latencies, queue depths, error code breakdowns, and provider health.",
    keywords: ["telemetry", "monitor", "dashboard", "recharts", "latency", "throughput", "observability", "metrics"],
    subSections: [
      { id: "dashboard-overview", title: "Observability Cockpit Overview" },
      { id: "key-performance-indicators", title: "Key Performance Indicators (KPIs)" },
      { id: "live-charting-breakdown", title: "Recharts Visualizations" },
      { id: "error-distribution-donut", title: "Error Classification & Taxonomy" }
    ]
  },
  "sse-stream": {
    id: "sse-stream",
    title: "SSE Live Log Stream",
    group: "Observability & Logs",
    badge: "Realtime",
    summary: "Zero-polling live event streaming via Server-Sent Events (/api/monitor/stream) with automatic reconnects and low CPU overhead.",
    keywords: ["sse", "server-sent events", "live stream", "streaming logs", "event source", "realtime"],
    subSections: [
      { id: "sse-architecture", title: "How SSE Streaming Works in Postly" },
      { id: "event-payload-schema", title: "Event Stream Protocol & Payloads" },
      { id: "reconnect-resilience", title: "Client Auto-Reconnection & Backoff" }
    ]
  },
  "dlq-retry": {
    id: "dlq-retry",
    title: "Dead-Letter Queue & Retries",
    group: "Observability & Logs",
    badge: "Reliability",
    summary: "Dead-Letter Queue triage: categorize failed emails by SMTP error code, inspect full raw socket error dumps, retry one-off, or execute bulk Retry-All.",
    keywords: ["dead letter queue", "dlq", "retry", "retry all", "failed emails", "smtp errors", "recovery"],
    subSections: [
      { id: "dlq-mechanics", title: "Dead-Letter Queue Mechanics" },
      { id: "inspecting-raw-errors", title: "Inspecting Raw Socket Errors" },
      { id: "single-retry-flow", title: "Targeted Single-Message Retry" },
      { id: "bulk-retry-all", title: "Batch 'Retry All' with Throttling" }
    ]
  },
  "analytics": {
    id: "analytics",
    title: "Open/Click Analytics & Bot Filter",
    group: "Observability & Logs",
    badge: "Analytics",
    summary: "Campaign engagement metrics, 1x1 transparent tracking pixel, bot filtration (Apple MPP, Google Proxy), and device/browser breakdowns.",
    keywords: ["open tracking", "click tracking", "bot filter", "apple mail privacy", "google proxy", "analytics", "csv export"],
    subSections: [
      { id: "open-pixel-engine", title: "1x1 GIF Tracking Pixel Operation" },
      { id: "bot-detection-mpp", title: "Filtering Apple MPP & Google Proxy Bots" },
      { id: "device-geo-attribution", title: "User-Agent Parsing & Geo Attribution" },
      { id: "exporting-reports", title: "Exporting CSV Campaign Reports" }
    ]
  },
  "rbac-roles": {
    id: "rbac-roles",
    title: "Access Control & Roles",
    group: "Security & Governance",
    badge: "Security",
    summary: "Role-Based Access Control matrix separating Super Admins, Workspace Members, and Mobile Gate Operators.",
    keywords: ["rbac", "roles", "permissions", "admin", "user", "operator", "security"],
    subSections: [
      { id: "role-hierarchy", title: "Role Hierarchy & Permissions Matrix" },
      { id: "session-security", title: "JWT & HTTP-Only Cookie Sessions" },
      { id: "privilege-escalation-defense", title: "Privilege Escalation Protection" }
    ]
  },
  "quotas": {
    id: "quotas",
    title: "Send Quotas & Rate Limits",
    group: "Security & Governance",
    badge: "Limits",
    summary: "Enforce daily and monthly sending limits per tenant, prevent provider IP reputation burnout, and configure admin quota overrides.",
    keywords: ["quotas", "rate limits", "daily limit", "monthly limit", "throttling", "abuse prevention"],
    subSections: [
      { id: "quota-levels", title: "Daily & Monthly Quota Enforcement" },
      { id: "over-quota-handling", title: "Behavior When Quotas Are Exhausted" },
      { id: "admin-quota-control", title: "Admin Quota Management UI" }
    ]
  },
  "audit-anomalies": {
    id: "audit-anomalies",
    title: "Audit Trail & Anomaly Engine",
    group: "Security & Governance",
    badge: "Compliance",
    summary: "Immutable audit trail across AUTH, EMAIL, and ADMIN categories, coupled with real-time heuristic anomaly detection.",
    keywords: ["audit logs", "anomalies", "security alerts", "brute force", "privilege escalation", "compliance"],
    subSections: [
      { id: "audit-log-categories", title: "Audit Event Categories (AUTH, EMAIL, ADMIN)" },
      { id: "anomaly-detection-rules", title: "Heuristic Anomaly Detection Rules" },
      { id: "retention-purging", title: "Log Retention Policies & Manual Purges" }
    ]
  },
  "domain-analytics": {
    id: "domain-analytics",
    title: "Domain & ISP Analytics",
    group: "Security & Governance",
    badge: "Insights",
    summary: "ISP deliverability intelligence: monitor inbox delivery performance across Gmail, Microsoft 365, Yahoo, and Corporate domains.",
    keywords: ["domain analytics", "isp deliverability", "gmail", "outlook", "microsoft 365", "bounce rates"],
    subSections: [
      { id: "isp-aggregation", title: "Automated Domain & ISP Grouping" },
      { id: "bounce-rate-monitoring", title: "ISP Bounce & Spam Complaint Monitoring" },
      { id: "optimizing-delivery", title: "Troubleshooting Specific Mailbox Providers" }
    ]
  },
  "announcements-push": {
    id: "announcements-push",
    title: "Announcements & Web Push",
    group: "Security & Governance",
    badge: "Broadcast",
    summary: "System-wide broadcast banners with priority levels, plus VAPID Web Push notifications delivered to mobile and desktop browsers.",
    keywords: ["announcements", "banners", "web push", "vapid", "notifications", "alerts", "service worker"],
    subSections: [
      { id: "broadcast-banners", title: "Global Announcement Banners" },
      { id: "web-push-vapid", title: "VAPID Web Push Notification Setup" },
      { id: "dispatch-alerts", title: "Campaign Completion & Failure Alerts" }
    ]
  },
  "api-auth": {
    id: "api-auth",
    title: "Authentication & Conventions",
    group: "Developer API Reference",
    badge: "REST",
    summary: "Base URLs, JSON formatting conventions, HTTP status codes, session cookie authentication, and standard API error response structures.",
    keywords: ["api", "rest api", "authentication", "bearer token", "http status", "error handling", "json schema"],
    subSections: [
      { id: "api-base-url", title: "Base URL & Headers" },
      { id: "api-authentication", title: "Authentication Mechanism" },
      { id: "api-status-codes", title: "HTTP Status Code Conventions" },
      { id: "api-error-envelope", title: "Standard Error Envelope" }
    ]
  },
  "api-send": {
    id: "api-send",
    title: "Send & Bulk Send Endpoints",
    group: "Developer API Reference",
    badge: "API",
    summary: "API specification for POST /api/send and POST /api/send-bulk with complete payload schemas, sample requests in cURL, Node.js, and Python.",
    keywords: ["api send", "api send bulk", "curl", "nodejs", "python", "rest endpoints", "email api"],
    subSections: [
      { id: "post-api-send", title: "POST /api/send (Single Message)" },
      { id: "post-api-send-bulk", title: "POST /api/send-bulk (Batch Campaign)" },
      { id: "code-examples-send", title: "Multi-Language Integration Code" }
    ]
  },
  "api-schedule": {
    id: "api-schedule",
    title: "Schedule & Queue Endpoints",
    group: "Developer API Reference",
    badge: "API",
    summary: "Programmatically schedule future mail dispatches, query pending queue items, and cancel or update scheduled campaigns.",
    keywords: ["api schedule", "api queue", "post schedule", "cancel schedule", "cron api"],
    subSections: [
      { id: "post-api-schedule", title: "POST /api/schedule" },
      { id: "get-api-scheduled", title: "GET /api/scheduled" },
      { id: "delete-api-scheduled", title: "DELETE /api/scheduled/:id" }
    ]
  },
  "api-qr-operator": {
    id: "api-qr-operator",
    title: "QR & Operator Check-in API",
    group: "Developer API Reference",
    badge: "API",
    summary: "Endpoints for generating dynamic branded QR passes, validating tokens, and executing operator check-ins from mobile apps or physical scanners.",
    keywords: ["api qr", "api operator", "validate token", "checkin api", "qr code generator"],
    subSections: [
      { id: "post-api-qr-generate", title: "POST /api/qr/generate" },
      { id: "post-api-operator-checkin", title: "POST /api/operator/checkin" },
      { id: "get-api-qr-validate", title: "GET /api/qr/validate" }
    ]
  },
  "api-stats": {
    id: "api-stats",
    title: "Telemetry & Stats API",
    group: "Developer API Reference",
    badge: "API",
    summary: "Retrieve aggregated system stats, delivery rates, queue latencies, and SMTP server health via REST endpoints for external dashboards.",
    keywords: ["api stats", "telemetry api", "monitor stats", "metrics endpoint", "prometheus", "datadog"],
    subSections: [
      { id: "get-api-monitor-stats", title: "GET /api/monitor/stats" },
      { id: "get-api-admin-stats", title: "GET /api/admin/stats" },
      { id: "get-api-user-stats", title: "GET /api/user/stats" }
    ]
  },
  "deliverability": {
    id: "deliverability",
    title: "DKIM, SPF & DMARC Setup",
    group: "Production Guides",
    badge: "Must-Know",
    summary: "Essential DNS record configurations required for inbox delivery to Gmail, Microsoft Outlook, and corporate anti-spam gateways.",
    keywords: ["deliverability", "dkim", "spf", "dmarc", "dns records", "inbox delivery", "spam avoidance"],
    subSections: [
      { id: "spf-setup", title: "Sender Policy Framework (SPF) Records" },
      { id: "dkim-keys", title: "DomainKeys Identified Mail (DKIM) 2048-bit" },
      { id: "dmarc-policy", title: "DMARC Alignment & Reporting (p=reject)" },
      { id: "dns-verification-tools", title: "Verification Commands & Tools" }
    ]
  },
  "smtp-errors": {
    id: "smtp-errors",
    title: "SMTP Error Dictionary (535, 550)",
    group: "Production Guides",
    badge: "Debug",
    summary: "Comprehensive guide to decoding SMTP response codes: 250 OK, 421 Service Unavailable, 451 Local Error, 535 Auth Failed, and 550 Mailbox Unavailable.",
    keywords: ["smtp error codes", "535", "550", "421", "451", "452", "554", "troubleshooting", "debug smtp"],
    subSections: [
      { id: "error-2xx-3xx", title: "2xx & 3xx Success / Handshake Codes" },
      { id: "error-4xx", title: "4xx Transient / Temporary Failures" },
      { id: "error-5xx", title: "5xx Permanent Failures (Auth & Rejection)" },
      { id: "common-fixes", title: "Prescribed Fixes for Common Failures" }
    ]
  },
  "ip-warmup": {
    id: "ip-warmup",
    title: "High-Volume IP Warm-up Ramp",
    group: "Production Guides",
    badge: "Strategy",
    summary: "Recommended 30-day send volume progression schedule to establish positive IP and domain reputation without triggering ISP spam filters.",
    keywords: ["ip warmup", "domain reputation", "volume ramp", "send schedule", "isp limits", "anti-spam"],
    subSections: [
      { id: "warmup-philosophy", title: "Why IP & Domain Warming is Critical" },
      { id: "30-day-ramp-schedule", title: "Recommended 30-Day Volume Ramp" },
      { id: "warmup-rules", title: "Golden Rules for Reputation Building" }
    ]
  }
};
