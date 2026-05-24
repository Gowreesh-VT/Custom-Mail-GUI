import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const globalSmtpSchema = new Schema(
  {
    host: String,
    port: Number,
    username: String,
    passwordEnc: String,
    fromName: String,
    fromEmail: String,
    encryption: { type: String, enum: ["TLS", "SSL", "NONE"], default: "TLS" },
    rejectUnauth: { type: Boolean, default: true }
  },
  { _id: false }
);

const systemConfigSchema = new Schema(
  {
    globalSmtpActive: { type: Boolean, default: false },
    globalSmtp: { type: globalSmtpSchema, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export type SystemConfigDocument = InferSchemaType<typeof systemConfigSchema> & { _id: string };
export const SystemConfig = (models.SystemConfig as Model<SystemConfigDocument>) || model<SystemConfigDocument>("SystemConfig", systemConfigSchema);
