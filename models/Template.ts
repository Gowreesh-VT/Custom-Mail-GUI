import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const templateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    subject: { type: String, default: "" },
    subjectLine: { type: String, default: "" },
    bodyHtml: { type: String, default: "" },
    mergeFields: { type: [String], default: [] },
    previewImage: { type: String, default: "" },
    isFavourite: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

templateSchema.index({ userId: 1, name: 1 });

export type TemplateDocument = InferSchemaType<typeof templateSchema> & { _id: string };
export const Template = (models.Template as Model<TemplateDocument>) || model<TemplateDocument>("Template", templateSchema);
