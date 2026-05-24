import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const emailEventSchema = new Schema(
  {
    emailId: { type: Schema.Types.ObjectId, ref: "Email", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["open", "click"], required: true, index: true },
    url: String,
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

export type EmailEventDocument = InferSchemaType<typeof emailEventSchema> & { _id: string };
export const EmailEvent = (models.EmailEvent as Model<EmailEventDocument>) || model<EmailEventDocument>("EmailEvent", emailEventSchema);
