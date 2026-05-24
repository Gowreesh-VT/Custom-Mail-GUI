import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";
import { attachmentSchema } from "./Email";

const draftSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    to: { type: [String], default: [] },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    replyTo: String,
    subject: { type: String, default: "" },
    bodyHtml: { type: String, default: "" },
    attachments: { type: [attachmentSchema], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

draftSchema.index({ userId: 1, updatedAt: -1 });

export type DraftDocument = InferSchemaType<typeof draftSchema> & { _id: string };
export const Draft = (models.Draft as Model<DraftDocument>) || model<DraftDocument>("Draft", draftSchema);
