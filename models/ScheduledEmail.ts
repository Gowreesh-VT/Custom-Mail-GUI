import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";
import { attachmentSchema } from "./Email";

const scheduledEmailSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    to: { type: [String], default: [] },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    subject: { type: String, required: true },
    bodyHtml: { type: String, default: "" },
    attachments: { type: [attachmentSchema], default: [] },
    scheduledAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["pending", "sent", "failed", "cancelled", "missed"], default: "pending", index: true },
    agendaJobId: String,
    sentAt: Date,
    errorMsg: String
  },
  { timestamps: true }
);

scheduledEmailSchema.index({ userId: 1, status: 1, scheduledAt: 1 });

export type ScheduledEmailDocument = InferSchemaType<typeof scheduledEmailSchema> & { _id: string };
export const ScheduledEmail = (models.ScheduledEmail as Model<ScheduledEmailDocument>) || model<ScheduledEmailDocument>("ScheduledEmail", scheduledEmailSchema);
