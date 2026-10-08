import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    district: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["Vegetables", "Fruits", "Grains", "Spices"],
    },
    product: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true },
    quantity: { type: String, required: true, trim: true },
    availabilityStatus: {
      type: String,
      enum: ["available", "low-stock", "sold-out", "temporarily-unavailable"],
      default: "available",
    },
    availableFrom: { type: Date },
    availableUntil: { type: Date },
    pickupPoint: { type: String, trim: true },
    deliveryAreas: [{ type: String, trim: true }],
    preferredDeliveryDays: [{ type: String, trim: true }],
    phone: { type: String, required: true, trim: true },
    initials: { type: String, required: true, trim: true, maxlength: 2 },
    image: { type: String, trim: true },
    ratings: [{ type: Number, min: 1, max: 5 }],
    ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value) =>
          value.length === 2 &&
          value[0] >= -90 &&
          value[0] <= 90 &&
          value[1] >= -180 &&
          value[1] <= 180,
        message: "Coordinates must be [latitude, longitude].",
      },
    },
  },
  { timestamps: true },
);

export default mongoose.model("Business", businessSchema);
