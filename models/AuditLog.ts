import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    userName: String,
    targetId: { type: Schema.Types.ObjectId },
    targetName: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: String,
    userAgent: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & { _id: string };
export const AuditLog = (models.AuditLog as Model<AuditLogDocument>) || model<AuditLogDocument>("AuditLog", auditLogSchema);
