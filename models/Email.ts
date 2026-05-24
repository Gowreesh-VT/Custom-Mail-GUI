import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

export const attachmentSchema = new Schema(
  {
    name: String,
    size: Number,
    mimeType: String,
    path: String
  },
  { _id: false }
);

const retryHistorySchema = new Schema(
  {
    attemptedAt: { type: Date, required: true },
    success: { type: Boolean, required: true },
    error: String
  },
  { _id: false }
);

const emailSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    to: { type: [String], default: [] },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    replyTo: String,
    subject: { type: String, required: true },
    bodyHtml: { type: String, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    status: { type: String, enum: ["sent", "failed"], required: true, index: true },
    errorMsg: String,
    isBulk: { type: Boolean, default: false, index: true },
    trackingEnabled: { type: Boolean, default: true },
    openCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    firstOpenedAt: Date,
    lastOpenedAt: Date,
    bulkStatus: { type: String, enum: ["completed", "partial", "stopped", ""], default: "" },
    sentAt: { type: Date, default: Date.now, index: true },
    retryCount: { type: Number, default: 0 },
    retryHistory: { type: [retryHistorySchema], default: [] },
    acknowledged: { type: Boolean, default: false, index: true }
  },
  { timestamps: false }
);

emailSchema.index({ userId: 1, sentAt: -1 });
emailSchema.index({ userId: 1, status: 1, acknowledged: 1, sentAt: -1 });

export type EmailDocument = InferSchemaType<typeof emailSchema> & { _id: string };
export const Email = (models.Email as Model<EmailDocument>) || model<EmailDocument>("Email", emailSchema);
