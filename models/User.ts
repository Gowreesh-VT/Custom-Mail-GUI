import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const smtpHealthSchema = new Schema(
  {
    testedAt: { type: Date, required: true },
    success: { type: Boolean, required: true },
    latencyMs: { type: Number, required: true },
    error: String
  },
  { _id: false }
);

const smtpConfigSchema = new Schema(
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

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user", index: true },
    isActive: { type: Boolean, default: true, index: true },
    forcePasswordReset: { type: Boolean, default: false },
    dailyLimit: { type: Number, default: 0 },
    monthlyLimit: { type: Number, default: 0 },
    smtpConfig: { type: smtpConfigSchema, default: {} },
    smtpHealthLog: { type: [smtpHealthSchema], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

userSchema.index({ email: 1 }, { unique: true });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };
export const User = (models.User as Model<UserDocument>) || model<UserDocument>("User", userSchema);
