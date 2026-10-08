import "dotenv/config";
import bcrypt from "bcrypt";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { imageSize } from "image-size";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import Admin from "./models/Admin.js";
import Business from "./models/Business.js";

const app = express();
const port = process.env.PORT || 4000;

if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is missing. Add a long random secret to .env.");
if (!process.env.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is missing. Add the initial administrator password to .env.");

app.set("trust proxy", 1);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use((request, response, next) => {
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';");
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(session({
  name: "helag.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB || undefined, collectionName: "sessions" }),
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 },
}));

const seedBusinesses = [
  {
    name: "Green Valley Organics",
    location: "Nuwara Eliya",
    district: "Nuwara Eliya",
    category: "Vegetables",
    product: "Organic Upcountry Veggies",
    price: "Rs. 280 / kg",
    quantity: "150 kg available",
    availabilityStatus: "available",
    pickupPoint: "Nuwara Eliya market entrance",
    deliveryAreas: ["Nuwara Eliya", "Kandy"],
    preferredDeliveryDays: ["Tuesday", "Friday"],
    phone: "+94 77 xxx xxxx",
    initials: "GV",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80",
    coordinates: [6.9497, 80.7891],
  },
  {
    name: "Senehasa Spice Garden",
    location: "Matale",
    district: "Matale",
    category: "Spices",
    product: "Ceylon Cinnamon Sticks",
    price: "Rs. 1,200 / kg",
    quantity: "42 kg available",
    availabilityStatus: "low-stock",
    pickupPoint: "Matale town collection point",
    deliveryAreas: ["Matale"],
    preferredDeliveryDays: ["Wednesday"],
    phone: "+94 71 xxx xxxx",
    initials: "SS",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=700&q=80",
    coordinates: [7.4675, 80.6234],
  },
  {
    name: "Ranweli Rice Mill",
    location: "Anuradhapura",
    district: "Anuradhapura",
    category: "Grains",
    product: "Traditional Red Rice",
    price: "Rs. 240 / kg",
    quantity: "500 kg available",
    availabilityStatus: "available",
    pickupPoint: "Ranweli Rice Mill gate",
    deliveryAreas: ["Anuradhapura", "Dambulla"],
    preferredDeliveryDays: ["Monday", "Thursday"],
    phone: "+94 76 xxx xxxx",
    initials: "RR",
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=80",
    coordinates: [8.3114, 80.4037],
  },
  {
    name: "Lihini Fruit Collective",
    location: "Kegalle",
    district: "Kegalle",
    category: "Fruits",
    product: "Sweet Cavendish Bananas",
    price: "Rs. 180 / dozen",
    quantity: "85 dozen available",
    availabilityStatus: "temporarily-unavailable",
    pickupPoint: "Kegalle bus stand",
    deliveryAreas: ["Kegalle"],
    preferredDeliveryDays: ["Saturday"],
    phone: "+94 72 xxx xxxx",
    initials: "LF",
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=700&q=80",
    coordinates: [7.2513, 80.3464],
  },
];

const toClientBusiness = (business) => {
  const value = business.toObject ? business.toObject() : business;
  return { ...value, id: value._id?.toString() || value.id, _id: undefined };
};

const requireAdmin = (request, response, next) => {
  if (!request.session.adminId) return response.status(401).json({ message: "Administrator authentication is required." });
  next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Try again later." },
});

const ratingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many rating attempts. Try again later." },
});

const listingFields = [
  "name",
  "location",
  "district",
  "category",
  "product",
  "price",
  "quantity",
  "availabilityStatus",
  "availableFrom",
  "availableUntil",
  "pickupPoint",
  "deliveryAreas",
  "preferredDeliveryDays",
  "phone",
  "initials",
  "image",
  "coordinates",
];

const pickListingFields = (source) =>
  Object.fromEntries(listingFields.filter((field) => Object.hasOwn(source, field)).map((field) => [field, source[field]]));

const maxImageBytes = 5 * 1024 * 1024;
const imageDataUrlPattern = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function validateImage(image) {
  if (!image || /^https:\/\//i.test(image)) return;
  if (typeof image !== "string") throw new Error("Image must be a valid JPEG, PNG, or WebP file.");
  const match = image.match(imageDataUrlPattern);
  if (!match) throw new Error("Image must be a valid JPEG, PNG, or WebP file.");
  const imageBuffer = Buffer.from(match[2], "base64");
  if (imageBuffer.length === 0 || imageBuffer.length > maxImageBytes)
    throw new Error("Image must be smaller than 5 MB.");
  let dimensions;
  try {
    dimensions = imageSize(imageBuffer);
  } catch {
    throw new Error("Image data could not be decoded.");
  }
  const expectedType = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[match[1]];
  if (dimensions.type !== expectedType)
    throw new Error("Image format does not match its file type.");
  if (
    dimensions.width < 100 ||
    dimensions.height < 100 ||
    dimensions.width > 4096 ||
    dimensions.height > 4096
  ) {
    throw new Error("Image dimensions must be between 100px and 4096px.");
  }
}

app.get("/api/health", (_request, response) => response.json({ ok: true }));

app.get("/api/auth/session", (request, response) => {
  if (!request.session.adminId) return response.status(401).json({ authenticated: false });
  response.json({ authenticated: true, username: request.session.username });
});

app.post("/api/auth/login", loginLimiter, async (request, response) => {
  const username = request.body.username?.trim().toLowerCase();
  const password = request.body.password;
  if (!username || !password) return response.status(400).json({ message: "Username and password are required." });
  const admin = await Admin.findOne({ username }).select("+passwordHash");
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return response.status(401).json({ message: "Invalid username or password." });
  request.session.regenerate((error) => {
    if (error) return response.status(500).json({ message: "Could not start a secure session." });
    request.session.adminId = admin.id;
    request.session.username = admin.username;
    response.json({ authenticated: true, username: admin.username });
  });
});

app.post("/api/auth/logout", (request, response) => {
  request.session.destroy(() => {
    response.clearCookie("helag.sid");
    response.status(204).end();
  });
});

app.get("/api/businesses", async (_request, response) => {
  try {
    const businesses = await Business.find().sort({ createdAt: 1 });
    response.json(businesses.map(toClientBusiness));
  } catch (error) {
    response
      .status(500)
      .json({ message: "Could not load businesses." });
  }
});

app.post("/api/businesses/:id/ratings", ratingLimiter, async (request, response) => {
  const rating = Number(request.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return response.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
  try {
    const business = await Business.findById(request.params.id);
    if (!business) return response.status(404).json({ message: "Business not found." });
    business.ratings = [...(business.ratings || []), rating];
    business.ratingCount = business.ratings.length;
    business.ratingAverage = business.ratings.reduce((total, value) => total + value, 0) / business.ratingCount;
    await business.save();
    response.json(toClientBusiness(business));
  } catch (error) {
    response.status(400).json({ message: "Could not save rating." });
  }
});

app.post("/api/businesses", requireAdmin, async (request, response) => {
  try {
    const payload = pickListingFields(request.body);
    validateImage(payload.image);
    const business = await Business.create(payload);
    response.status(201).json(toClientBusiness(business));
  } catch (error) {
    response
      .status(400)
      .json({ message: "Could not create business." });
  }
});

app.put("/api/businesses/:id", requireAdmin, async (request, response) => {
  try {
    const updates = pickListingFields(request.body);
    validateImage(updates.image);
    const business = await Business.findByIdAndUpdate(
      request.params.id,
      updates,
      { new: true, runValidators: true },
    );
    if (!business)
      return response.status(404).json({ message: "Business not found." });
    response.json(toClientBusiness(business));
  } catch (error) {
    response
      .status(400)
      .json({ message: "Could not update business." });
  }
});

app.delete("/api/businesses/:id", requireAdmin, async (request, response) => {
  try {
    const business = await Business.findByIdAndDelete(request.params.id);
    if (!business)
      return response.status(404).json({ message: "Business not found." });
    response.status(204).end();
  } catch (error) {
    response
      .status(400)
      .json({ message: "Could not delete business." });
  }
});

const start = async () => {
  if (!process.env.MONGODB_URI)
    throw new Error(
      "MONGODB_URI is missing. Add your MongoDB Atlas connection string to .env.",
    );
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB || undefined,
  });
  if ((await Business.countDocuments()) === 0)
    await Business.insertMany(seedBusinesses);
  const adminUsername = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  if (!(await Admin.exists({ username: adminUsername }))) {
    await Admin.create({ username: adminUsername, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12) });
  }
  app.listen(port, () =>
    console.log(`HelaG API running on http://localhost:${port}`),
  );
};

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
