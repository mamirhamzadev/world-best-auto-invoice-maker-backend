import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    payment_method: { type: String, default: "Cash" },
    payment_status: { type: String, default: "Paid" },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
