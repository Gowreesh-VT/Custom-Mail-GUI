import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const announcementSchema = new Schema(
  {
    message: { type: String, required: true },
    type: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: Date,
    dismissedBy: { type: [Schema.Types.ObjectId], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export type AnnouncementDocument = InferSchemaType<typeof announcementSchema> & { _id: string };
export const Announcement = (models.Announcement as Model<AnnouncementDocument>) || model<AnnouncementDocument>("Announcement", announcementSchema);
