import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import exifr from "exifr";
import logo from "./assets/helaharvest-logo.png";
import { infoContent } from "./infoContent";
import { languageOptions, translate } from "./i18n";
import "leaflet/dist/leaflet.css";
import "./App.css";
import "./crud.css";
import "./page-transition.css";

const initialBusinesses = [
  {
    id: 1,
    name: "Green Valley Organics",
    location: "Nuwara Eliya",
    district: "Nuwara Eliya",
    category: "Vegetables",
    product: "Organic Upcountry Veggies",
    price: "Rs. 280 / kg",
    quantity: "150 kg available",
    phone: "+94 77 234 8910",
    initials: "GV",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=700&q=80",
    coordinates: [6.9497, 80.7891],
  },
  {
    id: 2,
    name: "Senehasa Spice Garden",
    location: "Matale",
    district: "Matale",
    category: "Spices",
    product: "Ceylon Cinnamon Sticks",
    price: "Rs. 1,200 / kg",
    quantity: "42 kg available",
    phone: "+94 71 882 1402",
    initials: "SS",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=700&q=80",
    coordinates: [7.4675, 80.6234],
  },
  {
    id: 3,
    name: "Ranweli Rice Mill",
    location: "Anuradhapura",
    district: "Anuradhapura",
    category: "Grains",
    product: "Traditional Red Rice",
    price: "Rs. 240 / kg",
    quantity: "500 kg available",
    phone: "+94 76 441 2268",
    initials: "RR",
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=80",
    coordinates: [8.3114, 80.4037],
  },
  {
    id: 4,
    name: "Lihini Fruit Collective",
    location: "Kegalle",
    district: "Kegalle",
    category: "Fruits",
    product: "Sweet Cavendish Bananas",
    price: "Rs. 180 / dozen",
    quantity: "85 dozen available",
    phone: "+94 72 908 5531",
    initials: "LF",
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=700&q=80",
    coordinates: [7.2513, 80.3464],
  },
];

const categories = ["All products", "Vegetables", "Fruits", "Grains", "Spices"];
const sriLankaDistricts = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];
const pickupPointSuggestions = [
  "Main bus stand",
  "Town market",
  " ರೈலway station",
  "Farm gate",
  "Cooperative shop",
  "Weekly pola",
];
const normalizedPickupPointSuggestions = pickupPointSuggestions.map((suggestion) =>
  suggestion.endsWith("way station") ? "Railway station" : suggestion,
);
const deliveryDaySuggestions = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const availabilityStatuses = [
  { value: "available", label: "Available" },
  { value: "low-stock", label: "Low stock" },
  { value: "sold-out", label: "Sold out" },
  { value: "temporarily-unavailable", label: "Temporarily unavailable" },
];

const sriLankaCenter = [7.8731, 80.7718];
const emptyListingForm = {
  name: "",
  location: "",
  category: "Vegetables",
  product: "",
  price: "",
  quantity: "",
  phone: "",
  latitude: "",
  longitude: "",
  image: "",
  availabilityStatus: "available",
  availableFrom: "",
  availableUntil: "",
  pickupPoint: "",
  deliveryAreas: "",
  preferredDeliveryDays: "",
};
const demandInsightsKey = "helag-demand-insights";
const pendingListingOperationsKey = "helag-pending-listing-operations";

function loadDemandInsights() {
  try {
    const storedInsights = JSON.parse(
      localStorage.getItem(demandInsightsKey) || "[]",
    );
    return Array.isArray(storedInsights) ? storedInsights : [];
  } catch {
    return [];
  }
}

function loadPendingListingOperations() {
  try {
    const pendingOperations = JSON.parse(localStorage.getItem(pendingListingOperationsKey) || "[]");
    return Array.isArray(pendingOperations) ? pendingOperations : [];
  } catch {
    return [];
  }
}

async function fetchBusinessesFromApi() {
  const response = await fetch("/api/businesses");
  if (!response.ok) throw new Error("Could not load businesses");
  return (await response.json()).map(normalizeBusiness);
}

function normalizeBusiness(business) {
  const ratings = Array.isArray(business.ratings) ? business.ratings : [];
  return {
    ...business,
    availabilityStatus: business.availabilityStatus || "available",
    deliveryAreas: business.deliveryAreas || [],
    preferredDeliveryDays: business.preferredDeliveryDays || [],
    ratings,
    ratingAverage: Number(business.ratingAverage) || (ratings.length > 0 ? ratings.reduce((total, value) => total + value, 0) / ratings.length : 0),
    ratingCount: Number(business.ratingCount) || ratings.length,
  };
}

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;
const maxImageDimension = 4096;
const compressionDimension = 2048;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be decoded."));
    image.src = dataUrl;
  });
}

function signedGpsValue(value, reference) {
  if (Array.isArray(value)) {
    const [degrees = 0, minutes = 0, seconds = 0] = value.map(Number);
    value = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  const absoluteValue = Math.abs(numericValue);
  const normalizedReference = String(reference).toUpperCase();
  if (["S", "W"].includes(normalizedReference)) return -absoluteValue;
  if (["N", "E"].includes(normalizedReference)) return absoluteValue;
  return numericValue;
}

async function readImageGps(file) {
  const metadata = await exifr.parse(file, { gps: true });
  const latitude = signedGpsValue(
    metadata?.latitude ?? metadata?.GPSLatitude,
    metadata?.latitudeRef ?? metadata?.GPSLatitudeRef,
  );
  const longitude = signedGpsValue(
    metadata?.longitude ?? metadata?.GPSLongitude,
    metadata?.longitudeRef ?? metadata?.GPSLongitudeRef,
  );
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}

async function prepareImage(file) {
  if (!supportedImageTypes.has(file.type)) {
    throw new Error("Please choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > maxImageBytes) {
    throw new Error("Please choose an image smaller than 5 MB.");
  }
  const [sourceUrl, gps] = await Promise.all([
    readFileAsDataUrl(file),
    readImageGps(file).catch(() => null),
  ]);
  const image = await loadImage(sourceUrl);
  if (
    image.naturalWidth < 100 ||
    image.naturalHeight < 100 ||
    image.naturalWidth > maxImageDimension ||
    image.naturalHeight > maxImageDimension
  ) {
    throw new Error("Image dimensions must be between 100px and 4096px.");
  }
  let dataUrl = sourceUrl;
  if (
    file.size > 1.5 * 1024 * 1024 ||
    image.naturalWidth > compressionDimension ||
    image.naturalHeight > compressionDimension
  ) {
    const scale = Math.min(
      1,
      compressionDimension / image.naturalWidth,
      compressionDimension / image.naturalHeight,
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL("image/webp", 0.82);
  }
  return { dataUrl, gps };
}

function availabilityLabel(status) {
  return availabilityStatuses.find((item) => item.value === status)?.label || "Available";
}

function formatPrice(value) {
  const amount = String(value).match(/[\d,]+(?:\.\d+)?/g)?.[0];
  return amount ? `Rs.${amount.replaceAll(",", "")}/kg` : value;
}

function formatQuantity(value) {
  const amount = String(value).match(/[\d,]+(?:\.\d+)?/g)?.[0];
  return amount ? `${amount.replaceAll(",", "")}kg available` : value;
}

function distanceInKm(from, to) {
  if (!from) return null;
  const earthRadius = 6371;
  const latitudeDelta = ((to[0] - from[0]) * Math.PI) / 180;
  const longitudeDelta = ((to[1] - from[1]) * Math.PI) / 180;
  const latitudeOne = (from[0] * Math.PI) / 180;
  const latitudeTwo = (to[0] * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOne) *
      Math.cos(latitudeTwo) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function createBusinessIcon(isNearby, isSelected) {
  return L.divIcon({
    className: `business-pin ${isNearby ? "nearby" : ""} ${isSelected ? "selected" : ""}`,
    html: "<span>●</span>",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -27],
  });
}

function RecenterMap({ buyerLocation }) {
  const map = useMap();
  useEffect(() => {
    if (buyerLocation) map.flyTo(buyerLocation, 12, { duration: 1 });
  }, [buyerLocation, map]);
  return null;
}

function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function SuggestionInput({
  name,
  value,
  onChange,
  suggestions,
  placeholder,
  multiple = false,
  required = false,
  excludeSelected = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentQuery = multiple ? value.split(",").pop().trim() : value.trim();
  const selectedValues = multiple
    ? value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
    : [];
  const filteredSuggestions = suggestions
    .filter((suggestion) =>
      suggestion.toLowerCase().includes(currentQuery.toLowerCase()),
    )
    .filter(
      (suggestion) =>
        !excludeSelected ||
        !selectedValues.includes(suggestion.toLowerCase()),
    )
    .slice(0, 6);

  const normalizeMultipleValue = () => {
    if (!multiple || !excludeSelected) return;
    const uniqueValues = [];
    const seenValues = new Set();
    value.split(",").forEach((item) => {
      const trimmedItem = item.trim();
      const normalizedItem = trimmedItem.toLowerCase();
      if (trimmedItem && !seenValues.has(normalizedItem)) {
        seenValues.add(normalizedItem);
        uniqueValues.push(trimmedItem);
      }
    });
    const normalizedValue = uniqueValues.join(", ");
    if (normalizedValue !== value) onChange({ target: { name, value: normalizedValue } });
  };

  const selectSuggestion = (suggestion) => {
    const nextValue = multiple
      ? `${value.slice(0, value.lastIndexOf(",") + 1)}${value.includes(",") ? " " : ""}${suggestion}`
      : suggestion;
    onChange({ target: { name, value: nextValue } });
    setIsOpen(false);
  };

  return (
    <span className="suggestion-field">
      <input
        name={name}
        value={value}
        required={required}
        onChange={onChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          normalizeMultipleValue();
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <span className="suggestion-list" role="listbox">
          {filteredSuggestions.map((suggestion) => (
            <button
              type="button"
              role="option"
              key={suggestion}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function AdminDashboard({
  businesses,
  demandInsights,
  onAddBusiness,
  onUpdateBusiness,
  onDeleteBusiness,
  onLogout,
  onNotify,
}) {
  const [adminSearch, setAdminSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyListingForm);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [reportRange, setReportRange] = useState("30");
  const [locationStatus, setLocationStatus] = useState("idle");
  useEffect(() => {
    const closeOnEscape = (event) => event.key === "Escape" && setDeleteCandidate(null);
    if (deleteCandidate) window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteCandidate]);
  const adminBusinesses = businesses.filter((business) =>
    `${business.name} ${business.product} ${business.location}`
      .toLowerCase()
      .includes(adminSearch.toLowerCase()),
  );
  const categorySupply = categories
    .slice(1)
    .map((category) => ({
      category,
      listings: businesses.filter((business) => business.category === category)
        .length,
    }));
  const filteredInsights = demandInsights.filter((insight) => {
    if (reportRange === "all") return true;
    return insight.recordedAt >= Date.now() - Number(reportRange) * 24 * 60 * 60 * 1000;
  });
  const demandByLabel = filteredInsights.reduce(
    (totals, insight) => ({
      ...totals,
      [insight.label]:
        (totals[insight.label] || 0) + (insight.type === "contact" ? 2 : 1),
    }),
    {},
  );
  const demandLeaders = Object.entries(demandByLabel)
    .sort(([, firstScore], [, secondScore]) => secondScore - firstScore)
    .slice(0, 3);
  const sellerInterest = filteredInsights
    .filter((insight) => insight.type === "contact")
    .reduce(
      (totals, insight) => ({
        ...totals,
        [insight.label]: (totals[insight.label] || 0) + 1,
      }),
      {},
    );
  const mostContactedSeller = Object.entries(sellerInterest).sort(
    ([, firstCount], [, secondCount]) => secondCount - firstCount,
  )[0];
  const districtDemand = Object.entries(filteredInsights.reduce((totals, insight) => ({ ...totals, [insight.district || "Unspecified district"]: (totals[insight.district || "Unspecified district"] || 0) + 1 }), {})).sort(([, firstCount], [, secondCount]) => secondCount - firstCount).slice(0, 3);
  const categoryTrends = categories.slice(1).map((category) => ({ category, signals: filteredInsights.filter((insight) => insight.category === category || insight.label === category).length }));
  const exportListings = () => {
    const headings = ["Business", "District", "Category", "Product", "Availability", "Available from", "Available until", "Pickup point", "Delivery areas", "Preferred delivery days"];
    const rows = businesses.map((business) => [business.name, business.district || business.location, business.category, business.product, availabilityLabel(business.availabilityStatus), business.availableFrom?.slice(0, 10) || "", business.availableUntil?.slice(0, 10) || "", business.pickupPoint || "", (business.deliveryAreas || []).join("; "), (business.preferredDeliveryDays || []).join("; ")]);
    const csv = [headings, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "helag-coordinator-listings.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const updateForm = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const formatListingField = (event) => {
    const { name, value } = event.target;
    const formatters = { price: formatPrice, quantity: formatQuantity };
    const formatter = formatters[name];
    if (formatter) setForm((current) => ({ ...current, [name]: formatter(value) }));
  };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      onNotify("This browser does not support location services.", "error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        setLocationStatus("ready");
        onNotify("Current location added to the listing.");
      },
      (error) => {
        setLocationStatus("error");
        onNotify(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Enter coordinates manually."
            : "Could not determine your current location. Enter coordinates manually.",
          "error",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, gps } = await prepareImage(file);
      setForm((current) => ({
        ...current,
        image: dataUrl,
        ...(gps ? { latitude: gps.latitude, longitude: gps.longitude } : {}),
      }));
      if (gps) {
        onNotify("Image uploaded and GPS coordinates filled.");
      } else {
        onNotify("Image uploaded. No GPS location was found; enter coordinates manually.");
      }
    } catch (error) {
      onNotify(error.message, "error");
    } finally {
      event.target.value = "";
    }
  };
  const submitForm = async (event) => {
    event.preventDefault();
    const formattedPrice = formatPrice(form.price);
    const formattedQuantity = formatQuantity(form.quantity);
    const listing = {
      ...form,
      price: formattedPrice,
      quantity: formattedQuantity,
      id: editingId ?? Date.now(),
      initials: form.name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      image:
        form.image ||
        "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=700&q=80",
      coordinates: [Number(form.latitude), Number(form.longitude)],
      deliveryAreas: form.deliveryAreas.split(",").map((area) => area.trim()).filter(Boolean),
      preferredDeliveryDays: form.preferredDeliveryDays.split(",").map((day) => day.trim()).filter(Boolean),
    };
    try {
      const result = editingId ? await onUpdateBusiness(listing) : await onAddBusiness(listing);
      setForm(emptyListingForm);
      setEditingId(null);
      setShowForm(false);
      onNotify(result?.queued ? "Listing saved locally and will sync when the internet returns." : editingId ? "Listing updated successfully." : "New listing published successfully.");
    } catch (error) {
      onNotify(error.message, "error");
    }
  };
  const editBusiness = (business) => {
    setEditingId(business.id);
    setForm({
      name: business.name,
      location: business.location,
      category: business.category,
      product: business.product,
      price: business.price,
      quantity: business.quantity,
      phone: business.phone,
      latitude: business.coordinates[0],
      longitude: business.coordinates[1],
      image: business.image,
      availabilityStatus: business.availabilityStatus || "available",
      availableFrom: business.availableFrom?.slice(0, 10) || "",
      availableUntil: business.availableUntil?.slice(0, 10) || "",
      pickupPoint: business.pickupPoint || "",
      deliveryAreas: (business.deliveryAreas || []).join(", "),
      preferredDeliveryDays: (business.preferredDeliveryDays || []).join(", "),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyListingForm);
  };
  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await onDeleteBusiness(deleteCandidate.id);
      onNotify(`${deleteCandidate.name} was removed from the market.`);
      setDeleteCandidate(null);
    } catch (error) {
      onNotify(error.message, "error");
    }
  };

  return (
    <main className="admin-dashboard" id="top">
      <div className="admin-dashboard-heading">
        <div>
          <p className="eyebrow">FIELD OPERATIONS</p>
          <h1>
            Admin <em>workspace.</em>
          </h1>
          <p>
            Review listings collected by SMS and phone calls, then publish them
            to the buyer map.
          </p>
        </div>
        <div className="admin-dashboard-actions">
          <button className="secondary-button" onClick={onLogout}>
            Sign out
          </button>
          <button
            className="primary-button"
            onClick={() => (showForm ? closeForm() : setShowForm(true))}
          >
            {showForm ? "Close form" : "＋ Add listing"}
          </button>
        </div>
      </div>
      <div className="admin-metrics">
        <div>
          <span>ACTIVE LISTINGS</span>
          <strong>{businesses.length}</strong>
          <small>visible to buyers</small>
        </div>
        <div>
          <span>PRODUCT CATEGORIES</span>
          <strong>
            {new Set(businesses.map((business) => business.category)).size}
          </strong>
          <small>across the island</small>
        </div>
        <div>
          <span>MAP COVERAGE</span>
          <strong>100%</strong>
          <small>locations pinned</small>
        </div>
      </div>
      <section className="analytics-panel" aria-labelledby="analytics-title">
        <div className="analytics-heading">
          <div>
            <p className="eyebrow">SELLER INTELLIGENCE</p>
            <h2 id="analytics-title">Supply and demand signals</h2>
          </div>
          <span>Anonymous buyer activity on this device</span>
        </div>
        <div className="analytics-grid">
          <div className="supply-insight">
            <h3>Listing coverage</h3>
            {categorySupply.map(({ category, listings }) => (
              <div className="supply-row" key={category}>
                <span>{category}</span>
                <div>
                  <i
                    style={{
                      width: `${businesses.length ? (listings / businesses.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{listings}</strong>
              </div>
            ))}
          </div>
          <div className="demand-insight">
            <h3>Buyer interest</h3>
            {demandLeaders.length > 0 ? (
              <ol>
                {demandLeaders.map(([label, score]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <strong>
                      {score} signal{score === 1 ? "" : "s"}
                    </strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p>
                Searches, category choices, and seller contacts will appear here
                as buyers explore the market.
              </p>
            )}
          </div>
          <div className="seller-insight">
            <h3>Seller engagement</h3>
            {mostContactedSeller ? (
              <>
                <strong>{mostContactedSeller[0]}</strong>
                <span>
                  {mostContactedSeller[1]} contact intent
                  {mostContactedSeller[1] === 1 ? "" : "s"} recorded
                </span>
              </>
            ) : (
              <p>No seller contact signals yet.</p>
            )}
          </div>
        </div>
        <div className="report-tools">
          <label>Demand period<select value={reportRange} onChange={(event) => setReportRange(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All recorded activity</option></select></label>
          <div><strong>District demand</strong>{districtDemand.length > 0 ? districtDemand.map(([district, count]) => <span key={district}>{district}: {count}</span>) : <span>No district signals yet</span>}</div>
          <div><strong>Category trends</strong>{categoryTrends.map(({ category, signals }) => <span key={category}>{category}: {signals}</span>)}</div>
          <button className="secondary-button" type="button" onClick={exportListings}>Export CSV</button>
        </div>
      </section>
      {showForm && (
        <form className="listing-form" onSubmit={submitForm}>
          <div className="form-heading">
            <div>
              <p className="eyebrow">
                {editingId ? "EDIT LISTING" : "NEW LISTING"}
              </p>
              <h2>
                {editingId ? "Update this business" : "Add a local business"}
              </h2>
            </div>
            <span>
              Required details are collected from the seller by phone or SMS.
            </span>
          </div>
          <div className="form-grid">
            <label>
              Business name
              <input
                required
                name="name"
                value={form.name}
                onChange={updateForm}
                placeholder="e.g. Lakpura Farm"
              />
            </label>
            <label>
              Town / district
              <SuggestionInput
                name="location"
                value={form.location}
                onChange={updateForm}
                suggestions={sriLankaDistricts}
                placeholder="e.g. Badulla"
                required
              />
            </label>
            <label>
              Product name
              <input
                required
                name="product"
                value={form.product}
                onChange={updateForm}
                placeholder="e.g. Fresh green beans"
              />
            </label>
            <label>
              Category
              <select
                name="category"
                value={form.category}
                onChange={updateForm}
              >
                {categories.slice(1).map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Price
              <input
                required
                name="price"
                value={form.price}
                onChange={updateForm}
                onBlur={formatListingField}
                placeholder="Rs. 350 / kg"
              />
            </label>
            <label>
              Available quantity
              <input
                required
                name="quantity"
                value={form.quantity}
                onChange={updateForm}
                onBlur={formatListingField}
                placeholder="80 kg available"
              />
            </label>
            <label>
              Availability status
              <select name="availabilityStatus" value={form.availabilityStatus} onChange={updateForm}>
                {availabilityStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
            </label>
            <label>
              Available from
              <input type="date" name="availableFrom" value={form.availableFrom} onChange={updateForm} />
            </label>
            <label>
              Available until
              <input type="date" name="availableUntil" value={form.availableUntil} onChange={updateForm} />
            </label>
            <label>
              Pickup point
              <SuggestionInput
                name="pickupPoint"
                value={form.pickupPoint}
                onChange={updateForm}
                suggestions={normalizedPickupPointSuggestions}
                placeholder="e.g. Kegalle bus stand"
              />
            </label>
            <label>
              Delivery areas
              <SuggestionInput
                name="deliveryAreas"
                value={form.deliveryAreas}
                onChange={updateForm}
                suggestions={sriLankaDistricts}
                placeholder="Comma-separated districts"
                multiple
              />
            </label>
            <label>
              Preferred delivery days
              <SuggestionInput
                name="preferredDeliveryDays"
                value={form.preferredDeliveryDays}
                onChange={updateForm}
                suggestions={deliveryDaySuggestions}
                placeholder="e.g. Tuesday, Friday"
                multiple
                excludeSelected
              />
            </label>
            <label>
              Contact number
              <input
                required
                name="phone"
                value={form.phone}
                onChange={updateForm}
                placeholder="+94 77 123 4567"
              />
            </label>
            <div className="product-image-field">
              Product image
              <div className="image-upload-controls">
                <label
                  className="camera-upload-button"
                  title="Capture image with camera"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                    <path d="M8.5 5.5 10 3h4l1.5 2.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3.5Z" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                  <span>Camera</span>
                  <input
                    className="camera-upload-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                  />
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
              <small className="field-hint">
                Capture a photo or choose an image from this device. Maximum 5 MB.
              </small>
            </div>
            <label>
              Latitude
              <input
                required
                type="number"
                step="any"
                name="latitude"
                value={form.latitude}
                onChange={updateForm}
                placeholder="6.9271"
              />
            </label>
            <label>
              Longitude
              <input
                required
                type="number"
                step="any"
                name="longitude"
                value={form.longitude}
                onChange={updateForm}
                placeholder="79.8612"
              />
              <button
                type="button"
                className="location-button"
                onClick={useCurrentLocation}
                disabled={locationStatus === "loading"}
              >
                {locationStatus === "loading" ? "Finding location..." : "Use current location"}
              </button>
            </label>
            {form.image && (
              <div className="image-preview">
                <img src={form.image} alt="Selected listing" />
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, image: "" }))
                  }
                >
                  Remove image
                </button>
              </div>
            )}
          </div>
          <div className="form-actions">
            <span>
              Use coordinates from the seller&apos;s location or a map lookup.
            </span>
            <button className="primary-button" type="submit">
              {editingId ? "Save changes" : "Publish listing"}
            </button>
          </div>
        </form>
      )}
      <div className="admin-listings">
        <div className="admin-listings-heading">
          <div>
            <p className="eyebrow">LISTING DIRECTORY</p>
            <h2>All businesses</h2>
          </div>
          <div className="admin-search">
            <span>⌕</span>
            <input
              value={adminSearch}
              onChange={(event) => setAdminSearch(event.target.value)}
              placeholder="Search listings"
              aria-label="Search admin listings"
            />
          </div>
        </div>
        <div className="listing-table">
          {adminBusinesses.map((business) => (
            <div className="listing-row" key={business.id}>
              <div className="listing-avatar">{business.initials}</div>
              <div className="listing-name">
                <strong>{business.name}</strong>
                <span>{business.product}</span>
              </div>
              <div className="listing-place">⌖ {business.location}</div>
              <div className="listing-status">
                <i /> {availabilityLabel(business.availabilityStatus)}
              </div>
              <div className="listing-actions">
                <button
                  className="edit-listing"
                  onClick={() => editBusiness(business)}
                  aria-label={`Edit ${business.name}`}
                >
                  Edit
                </button>
                <button
                  className="delete-listing"
                  onClick={() => setDeleteCandidate(business)}
                  aria-label={`Delete ${business.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {adminBusinesses.length === 0 && (
            <div className="empty-admin">No listings match your search.</div>
          )}
        </div>
      </div>
      {deleteCandidate && (
        <div
          className="confirmation-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDeleteCandidate(null)
          }
        >
          <section
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <p className="eyebrow">CONFIRM DELETION</p>
            <h2 id="delete-title">Delete this listing?</h2>
            <p>
              <strong>{deleteCandidate.name}</strong> will no longer appear on
              the buyer map. This cannot be undone.
            </p>
            <div>
              <button
                className="secondary-button"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button className="danger-button" onClick={confirmDelete}>
                Delete listing
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function InfoPage({ page, onNavigate, language }) {
  const pageContent = {
    about: {
      eyebrow: "OUR PURPOSE",
      title: (
        <>
          A shorter distance
          <br />
          <em>between people.</em>
        </>
      ),
      intro:
        "HelaG helps small scale farmers and local businesses in Sri Lanka reach more customers without needing a smartphone, website, or digital payment account.",
    },
    faq: {
      eyebrow: "NEED TO KNOW",
      title: (
        <>
          Questions, kept
          <br />
          <em>simple.</em>
        </>
      ),
      intro:
        "Everything you need to know about finding a seller, placing an order, and supporting local livelihoods through HelaG.",
    },
    contact: {
      eyebrow: "GET IN TOUCH",
      title: (
        <>
          Let&apos;s keep it
          <br />
          <em>local.</em>
        </>
      ),
      intro:
        "Whether you are a buyer, farmer, business owner, or community coordinator, we would like to hear from you.",
    },
  };
  const content = (infoContent[language] || infoContent.en)[page];

  return (
    <main className="info-page" id="top">
      <div className="info-hero">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title[0]}<br /><em>{content.title[1]}</em></h1>
        <p>{content.intro}</p>
      </div>
      {page === "about" && (
        <div className="info-columns">
          <div>
            <span className="info-number">01</span>
            <h2>{content.blocks[0][0]}</h2><p>{content.blocks[0][1]}</p>
          </div>
          <div>
            <span className="info-number">02</span>
            <h2>{content.blocks[1][0]}</h2><p>{content.blocks[1][1]}</p>
          </div>
          <div>
            <span className="info-number">03</span>
            <h2>{content.blocks[2][0]}</h2><p>{content.blocks[2][1]}</p>
          </div>
        </div>
      )}
      {page === "faq" && (
        <div className="faq-list">
          <details open>
            <summary>{content.items[0][0]}</summary><p>{content.items[0][1]}</p>
          </details>
          <details>
            <summary>{content.items[1][0]}</summary><p>{content.items[1][1]}</p>
          </details>
          <details>
            <summary>{content.items[2][0]}</summary><p>{content.items[2][1]}</p>
          </details>
          <details>
            <summary>{content.items[3][0]}</summary><p>{content.items[3][1]}</p>
          </details>
        </div>
      )}
      {page === "contact" && (
        <div className="contact-grid">
          <div className="contact-card">
            <span className="contact-label">{content.cards[0][0]}</span><h2>{content.cards[0][1]}</h2>
            <a href="mailto:hello@helag.lk">hello@helag.lk</a>
            <p>{content.cards[0][2]}</p>
          </div>
          <div className="contact-card">
            <span className="contact-label">{content.cards[1][0]}</span><h2>{content.cards[1][1]}</h2>
            <a href="tel:+9411xxxxxxx">+94 11 xxx xxxx</a>
            <p>{content.cards[1][2]}</p>
          </div>
          <div className="contact-card">
            <span className="contact-label">{content.cards[2][0]}</span><h2>{content.cards[2][1]}</h2><p>{content.cards[2][2]}</p><a href="sms:+94112345678">{content.cards[2][3]}</a>
          </div>
        </div>
      )}
      <div className="info-back">
        <button onClick={() => onNavigate("home")}>
          ← {(infoContent[language] || infoContent.en).back}
        </button>
      </div>
    </main>
  );
}

function App() {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("helag-language") || "en",
  );
  const [selectedId, setSelectedId] = useState(1);
  const [activeCategory, setActiveCategory] = useState("All products");
  const [search, setSearch] = useState("");
  const [adminMode, setAdminMode] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [businesses, setBusinesses] = useState(() => initialBusinesses.map(normalizeBusiness));
  const [dataError, setDataError] = useState("");
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [activePage, setActivePage] = useState("home");
  const [routeBusinessId, setRouteBusinessId] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeStatus, setRouteStatus] = useState("idle");
  const [ratingHover, setRatingHover] = useState(0);
  const [demandInsights, setDemandInsights] = useState(loadDemandInsights);
  const [pendingListingOperations, setPendingListingOperations] = useState(loadPendingListingOperations);
  const [notification, setNotification] = useState(null);
  const t = (key) => translate(language, key);

  useEffect(() => {
    if (!notification) return undefined;
    const timeout = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  const changeLanguage = (event) => {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    localStorage.setItem("helag-language", nextLanguage);
  };

  const trackDemand = (type, label, details = {}) => {
    const normalizedLabel = label.trim();
    if (!normalizedLabel) return;
    setDemandInsights((currentInsights) => {
      const nextInsights = [
        ...currentInsights,
        { type, label: normalizedLabel, recordedAt: Date.now(), ...details },
      ].slice(-250);
      localStorage.setItem(demandInsightsKey, JSON.stringify(nextInsights));
      return nextInsights;
    });
  };

  const showNotification = (message, type = "success") =>
    setNotification({ message, type });

  const submitRating = async (businessId, rating) => {
    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not save rating.");
      const ratedBusiness = normalizeBusiness(result);
      setBusinesses((currentBusinesses) => currentBusinesses.map((business) => business.id === ratedBusiness.id ? ratedBusiness : business));
      setRatingHover(0);
      showNotification("Thanks for rating this service.");
    } catch (error) {
      showNotification(error.message, "error");
    }
  };

  const queueListingOperation = (type, business) => {
    setPendingListingOperations((currentOperations) => {
      const existingCreateIndex = currentOperations.findIndex((operation) => operation.type === "create" && operation.business.id === business.id);
      const existingUpdateIndex = currentOperations.findIndex((operation) => operation.type === "update" && operation.business.id === business.id);
      let nextOperations;
      if (type === "update" && existingCreateIndex >= 0) {
        nextOperations = currentOperations.map((operation, index) => index === existingCreateIndex ? { ...operation, business } : operation);
      } else if (type === "update" && existingUpdateIndex >= 0) {
        nextOperations = currentOperations.map((operation, index) => index === existingUpdateIndex ? { ...operation, business } : operation);
      } else {
        nextOperations = [...currentOperations, { type, business }];
      }
      localStorage.setItem(pendingListingOperationsKey, JSON.stringify(nextOperations));
      return nextOperations;
    });
  };

  const selectedBusiness = businesses.find(
    (business) => business.id === selectedId,
  );
  const selectedDistance = selectedBusiness
    ? distanceInKm(buyerLocation, selectedBusiness.coordinates)
    : null;
  const filteredBusinesses = useMemo(
    () =>
      businesses.filter((business) => {
        const matchesCategory =
          activeCategory === "All products" ||
          business.category === activeCategory;
        const searchTerm = search.toLowerCase();
        return (
          matchesCategory &&
          `${business.name} ${business.product} ${business.location}`
            .toLowerCase()
            .includes(searchTerm)
        );
      }),
    [activeCategory, search, businesses],
  );

  useEffect(() => {
    fetchBusinessesFromApi()
      .then((loadedBusinesses) => {
        if (loadedBusinesses.length > 0) {
          setBusinesses(loadedBusinesses);
          setSelectedId(loadedBusinesses[0].id);
        }
        setDataError("");
      })
      .catch(() => setDataError("Database offline: showing demo listings."));
  }, []);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((session) => setIsAdminAuthenticated(session.authenticated === true))
      .catch(() => setIsAdminAuthenticated(false));
  }, []);

  useEffect(() => {
    if (!buyerLocation || !routeBusinessId) {
      setRouteCoordinates([]);
      setRouteSummary(null);
      return undefined;
    }
    const routeBusiness = businesses.find(
      (business) => business.id === routeBusinessId,
    );
    if (!routeBusiness) return undefined;
    const controller = new AbortController();
    setRouteStatus("loading");
    const [buyerLatitude, buyerLongitude] = buyerLocation;
    const [businessLatitude, businessLongitude] = routeBusiness.coordinates;
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${buyerLongitude},${buyerLatitude};${businessLongitude},${businessLatitude}?overview=full&geometries=geojson&steps=false`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) throw new Error("Route request failed");
        return response.json();
      })
      .then((data) => {
        const route = data.routes?.[0];
        if (!route) throw new Error("No route found");
        setRouteCoordinates(
          route.geometry.coordinates.map(([longitude, latitude]) => [
            latitude,
            longitude,
          ]),
        );
        setRouteSummary({
          distance: route.distance / 1000,
          duration: Math.round(route.duration / 60),
        });
        setRouteStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setRouteStatus("error");
          setRouteCoordinates([]);
          setRouteSummary(null);
        }
      });
    return () => controller.abort();
  }, [buyerLocation, businesses, routeBusinessId]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerLocation([position.coords.latitude, position.coords.longitude]);
        setLocationStatus("ready");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    const captureInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const clearInstallPrompt = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerLocation([position.coords.latitude, position.coords.longitude]);
        setLocationStatus("ready");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const openAdmin = () => {
    if (isAdminAuthenticated) setAdminMode(!adminMode);
    else setLoginOpen(true);
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not sign in.");
      setIsAdminAuthenticated(true);
      setAdminMode(true);
      setLoginOpen(false);
      setLoginError("");
      setLoginForm({ username: "", password: "" });
      showNotification("Signed in to the administrator workspace.");
    } catch (error) {
      setLoginError(error.message);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setIsAdminAuthenticated(false);
    setAdminMode(false);
    showNotification("Signed out successfully.");
  };

  const createBusiness = async (business) => {
    if (!navigator.onLine) {
      setBusinesses((currentBusinesses) => [...currentBusinesses, normalizeBusiness(business)]);
      queueListingOperation("create", business);
      return { queued: true };
    }
    try {
      const { id: _id, ...payload } = business;
      const response = await fetch("/api/businesses", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || "Could not save listing");
      }
      await response.json();
      setBusinesses(await fetchBusinessesFromApi());
      return { queued: false };
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      setBusinesses((currentBusinesses) => [...currentBusinesses, normalizeBusiness(business)]);
      queueListingOperation("create", business);
      return { queued: true };
    }
  };

  const updateBusiness = async (business) => {
    if (!navigator.onLine) {
      setBusinesses((currentBusinesses) => currentBusinesses.map((currentBusiness) => currentBusiness.id === business.id ? normalizeBusiness(business) : currentBusiness));
      queueListingOperation("update", business);
      return { queued: true };
    }
    try {
      const { id, ...payload } = business;
      const response = await fetch(`/api/businesses/${encodeURIComponent(id)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || "Could not update listing");
      }
      await response.json();
      setBusinesses(await fetchBusinessesFromApi());
      return { queued: false };
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      setBusinesses((currentBusinesses) => currentBusinesses.map((currentBusiness) => currentBusiness.id === business.id ? normalizeBusiness(business) : currentBusiness));
      queueListingOperation("update", business);
      return { queued: true };
    }
  };

  useEffect(() => {
    if (!isOnline || pendingListingOperations.length === 0) return undefined;
    let cancelled = false;
    const syncPendingListings = async () => {
      const remainingOperations = [...pendingListingOperations];
      for (const operation of pendingListingOperations) {
        try {
          if (operation.type === "create") {
            const { id: _id, ...payload } = operation.business;
            const response = await fetch("/api/businesses", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error("Could not sync listing");
          } else {
            const { id, ...payload } = operation.business;
            const response = await fetch(`/api/businesses/${encodeURIComponent(id)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error("Could not sync listing");
          }
          remainingOperations.shift();
          localStorage.setItem(pendingListingOperationsKey, JSON.stringify(remainingOperations));
        } catch {
          if (!cancelled) setPendingListingOperations([...remainingOperations]);
          return;
        }
      }
      if (!cancelled) {
        setBusinesses(await fetchBusinessesFromApi());
        setPendingListingOperations([]);
        showNotification("Saved offline listings have synced.");
      }
    };
    syncPendingListings();
    return () => { cancelled = true; };
  }, [isOnline, pendingListingOperations]);

  const deleteBusiness = async (id) => {
    const response = await fetch(`/api/businesses/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error || error.message || "Could not delete listing",
      );
    }
    setBusinesses(await fetchBusinessesFromApi());
  };

  const navigate = (page) => {
    setActivePage(page);
    setAdminMode(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="HelaG home">
          <img className="brand-logo" src={logo} alt="" />
          <span>
            Hela<span>G</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={activePage === "home" ? "active" : ""}
            onClick={() => navigate("home")}
          >
            {t("browse")}
          </button>
          <button
            className={activePage === "about" ? "active" : ""}
            onClick={() => navigate("about")}
          >
            {t("about")}
          </button>
          <button
            className={activePage === "faq" ? "active" : ""}
            onClick={() => navigate("faq")}
          >
            {t("faq")}
          </button>
          <button
            className={activePage === "contact" ? "active" : ""}
            onClick={() => navigate("contact")}
          >
            {t("contact")}
          </button>
        </nav>
        <div className="top-actions">
          {installPrompt && (
            <button className="install-button" onClick={installApp}>
              ＋ Install app
            </button>
          )}
          <select
            className="language-select"
            value={language}
            onChange={changeLanguage}
            aria-label="Choose language"
          >
            {languageOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="offline-pill">
            <span className="status-dot" />{" "}
            {isOnline
              ? dataError
                ? t("cachedListings")
                : t("liveListings")
              : t("offline")}
          </span>
          <button
            className={`admin-button ${adminMode ? "selected" : ""}`}
            onClick={openAdmin}
          >
            <span className="admin-icon">▣</span>{" "}
            {adminMode ? t("closeAdmin") : t("adminAccess")}
          </button>
        </div>
      </header>

      {notification && (
        <div
          className={`notification-toast ${notification.type}`}
          role="status"
        >
          <span>{notification.type === "error" ? "!" : "✓"}</span>
          <p>{notification.message}</p>
          <button
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {adminMode ? (
        <AdminDashboard
          businesses={businesses}
          demandInsights={demandInsights}
          onAddBusiness={createBusiness}
          onUpdateBusiness={updateBusiness}
          onDeleteBusiness={deleteBusiness}
          onLogout={logout}
          onNotify={showNotification}
        />
      ) : activePage !== "home" ? (
        <InfoPage key={activePage} page={activePage} onNavigate={navigate} language={language} />
      ) : (
        <main id="top">
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="eyebrow-line" /> {t("localGoods")}
              </p>
              <h1>
                {t("heroTitle")
                  .split("\n")
                  .map((line, index) => (
                    <span key={line}>
                      {index > 0 && <br />}
                      <em>{index > 0 ? line : line}</em>
                    </span>
                  ))}
              </h1>
              <p className="hero-text">{t("heroText")}</p>
              <div className="trust-row">
                <span className="trust-icon">✓</span>
                <span>{t("verifiedCoordinators")}</span>
              </div>
            </div>
          </section>

          <section className="market-section" id="market">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("exploreIsland")}</p>
                <h2>{t("findSomething")}</h2>
              </div>
              <div className="listing-count">
                <strong>{filteredBusinesses.length}</strong>
                <span>
                  {t("activeListings")}
                  <br />
                  {t("acrossSriLanka")}
                </span>
              </div>
            </div>

            <div className="filter-row">
              <div className="search-box">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) =>
                    event.key === "Enter" && trackDemand("search", search)
                  }
                  placeholder={t("search")}
                  aria-label={t("search")}
                />
              </div>
              <div
                className="category-tabs"
                role="tablist"
                aria-label="Product categories"
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    className={activeCategory === category ? "active" : ""}
                    onClick={() => {
                      setActiveCategory(category);
                      if (category !== "All products")
                        trackDemand("category", category, { category });
                    }}
                  >
                    {t(
                      category === "All products"
                        ? "allProducts"
                        : category.toLowerCase(),
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="market-grid">
              <div className="map-wrap">
                <div className="map-toolbar">
                  <span>
                    <span className="live-dot" /> {t("liveMap")}
                  </span>
                  <span className="map-label">{t("mapLabel")}</span>
                </div>
                <div
                  className="map-canvas leaflet-holder"
                  aria-label="OpenStreetMap of Sri Lanka with local business markers"
                >
                  <MapContainer
                    center={sriLankaCenter}
                    zoom={7}
                    minZoom={6}
                    maxZoom={16}
                    scrollWheelZoom
                    className="leaflet-map"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <RecenterMap buyerLocation={buyerLocation} />
                    <ResizeMap />
                    {buyerLocation && (
                      <>
                        <Circle
                          center={buyerLocation}
                          radius={1000}
                          pathOptions={{
                            color: "#e57b46",
                            fillColor: "#e57b46",
                            fillOpacity: 0.12,
                            weight: 2,
                          }}
                        />
                        <Marker
                          position={buyerLocation}
                          icon={L.divIcon({
                            className: "buyer-pin",
                            html: "<span>●</span>",
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                          })}
                        >
                          <Popup>
                            <strong>Your current location</strong>
                            <br />
                            Nearby listings are highlighted within 1 km.
                          </Popup>
                        </Marker>
                      </>
                    )}
                    {routeCoordinates.length > 0 && (
                      <Polyline
                        positions={routeCoordinates}
                        pathOptions={{
                          color: "#e57b46",
                          weight: 5,
                          opacity: 0.9,
                          lineCap: "round",
                          lineJoin: "round",
                        }}
                      />
                    )}
                    {filteredBusinesses.map((business) => {
                      const distance = distanceInKm(
                        buyerLocation,
                        business.coordinates,
                      );
                      const isNearby = distance !== null && distance <= 1;
                      return (
                        <Marker
                          key={business.id}
                          position={business.coordinates}
                          icon={createBusinessIcon(
                            isNearby,
                            selectedId === business.id,
                          )}
                          keyboard
                          title={`${business.name}: ${business.product}`}
                          alt={`${business.name}: ${business.product}`}
                          eventHandlers={{
                            click: () => {
                              setSelectedId(business.id);
                              setRouteBusinessId(business.id);
                            },
                          }}
                        >
                          <Popup>
                            <strong>{business.name}</strong>
                            <br />
                            {business.product}
                            <br />
                            <span>
                              {distance === null
                                ? t("enableLocation")
                                : `${distance.toFixed(1)} km ${t("fromLocation")}`}
                            </span>
                            <br />
                            <small>{t("clickRoute")}</small>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>
                <div className="map-footer">
                  <span>
                    <i className="marker-key" /> {t("localBusiness")}
                  </span>
                  <span className="map-footer-actions">
                    {routeSummary && (
                      <span className="route-summary">
                        {t("route")} {routeSummary.distance.toFixed(1)} km ·{" "}
                        {routeSummary.duration} {t("min")}
                      </span>
                    )}
                    <button
                      className="location-button"
                      onClick={requestLocation}
                    >
                      {locationStatus === "loading"
                        ? "Locating…"
                        : buyerLocation
                          ? t("locationEnabled")
                          : t("useLocation")}
                    </button>
                    <span>
                      {routeStatus === "loading"
                        ? t("findingRoute")
                        : routeSummary
                          ? t("orangeRoute")
                          : buyerLocation
                            ? t("clickRoute")
                            : t("tapMarker")}
                    </span>
                  </span>
                </div>
              </div>

              <div className="detail-panel">
                {selectedBusiness ? (
                  <>
                    <div
                      className="detail-image"
                      style={{
                        backgroundImage: `url(${selectedBusiness.image})`,
                      }}
                    >
                      <span className="verified-badge">✓ Verified listing</span>
                      <span className="detail-category">
                        {selectedBusiness.category}
                      </span>
                      <span className={`availability-badge ${selectedBusiness.availabilityStatus}`}>
                        {availabilityLabel(selectedBusiness.availabilityStatus)}
                      </span>
                    </div>
                    <div className="detail-content">
                      <p className="detail-location">
                        ⌖ {selectedBusiness.location}, Sri Lanka{" "}
                        {selectedDistance !== null && (
                          <strong className="distance-readout">
                            · {selectedDistance.toFixed(1)} km{" "}
                            {t("fromLocation")}
                          </strong>
                        )}
                      </p>
                      <h3>{selectedBusiness.name}</h3>
                      <p className="detail-product">
                        {selectedBusiness.product}
                      </p>
                      <div className="detail-stats">
                        <div>
                          <span>{t("price")}</span>
                          <strong>{selectedBusiness.price}</strong>
                        </div>
                        <div>
                          <span>{t("available")}</span>
                          <strong>{selectedBusiness.quantity}</strong>
                        </div>
                      </div>
                      <section className="rating-card" aria-label="Service rating">
                        <div>
                          <strong>{selectedBusiness.ratingCount > 0 ? selectedBusiness.ratingAverage.toFixed(1) : "New"}</strong>
                          <span>{selectedBusiness.ratingCount > 0 ? `${selectedBusiness.ratingCount} rating${selectedBusiness.ratingCount === 1 ? "" : "s"}` : "No ratings yet"}</span>
                        </div>
                        <div className="rating-control">
                          <span>Rate this service</span>
                          <div className="rating-stars" onMouseLeave={() => setRatingHover(0)}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                className={star <= (ratingHover || Math.round(selectedBusiness.ratingAverage)) ? "active" : ""}
                                aria-label={`Rate ${star} out of 5`}
                                onMouseEnter={() => setRatingHover(star)}
                                onFocus={() => setRatingHover(star)}
                                onClick={() => submitRating(selectedBusiness.id, star)}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                      </section>
                      {(selectedBusiness.pickupPoint || selectedBusiness.deliveryAreas.length > 0 || selectedBusiness.preferredDeliveryDays.length > 0) && (
                        <section className="delivery-details" aria-label={t("deliveryDetails")}>
                          <strong>{t("collectionDelivery")}</strong>
                          {selectedBusiness.pickupPoint && <span>{t("pickup")}: {selectedBusiness.pickupPoint}</span>}
                          {selectedBusiness.deliveryAreas.length > 0 && <span>{t("deliveryAreas")}: {selectedBusiness.deliveryAreas.join(", ")}</span>}
                          {selectedBusiness.preferredDeliveryDays.length > 0 && <span>{t("preferredDays")}: {selectedBusiness.preferredDeliveryDays.join(", ")}</span>}
                        </section>
                      )}
                      <div className="contact-block">
                        <p>{t("interested")}</p>
                        <span>{t("reachOut")}</span>
                        <div className="contact-actions">
                          <a
                            className="call-button"
                            href={`tel:${selectedBusiness.phone.replaceAll(" ", "")}`}
                            onClick={() =>
                              trackDemand("contact", selectedBusiness.name, { district: selectedBusiness.district || selectedBusiness.location, category: selectedBusiness.category })
                            }
                          >
                            ☎ {t("callSeller")}
                          </a>
                          <a
                            className="sms-button"
                            href={`sms:${selectedBusiness.phone.replaceAll(" ", "")}`}
                            onClick={() =>
                              trackDemand("contact", selectedBusiness.name, { district: selectedBusiness.district || selectedBusiness.location, category: selectedBusiness.category })
                            }
                          >
                            ▱ {t("sendSms")}
                          </a>
                        </div>
                      </div>
                      <p className="contact-number">
                        {t("contactLabel")}:{" "}
                        <strong>{selectedBusiness.phone}</strong>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    No listings match your search.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="value-strip" id="how-it-works">
            <div>
              <span className="value-number">01</span>
              <strong>Browse nearby goods</strong>
              <span>See what&apos;s available around the island.</span>
            </div>
            <div>
              <span className="value-number">02</span>
              <strong>Connect your way</strong>
              <span>Call or text the seller directly.</span>
            </div>
            <div>
              <span className="value-number">03</span>
              <strong>Keep value local</strong>
              <span>Every purchase supports a livelihood.</span>
            </div>
          </section>
        </main>
      )}
      <footer id="about" className="site-footer">
        <div className="footer-top">
          <div className="footer-intro">
            <div className="footer-brand">
              <img className="brand-logo" src={logo} alt="" />
              <span>
                Hela<span>G</span>
              </span>
            </div>
            <p>
              A simple bridge between Sri Lanka&apos;s small producers and the
              people who value them.
            </p>
            <span className="footer-note">Good goods. Good livelihoods.</span>
          </div>
          <div className="footer-column">
            <strong>Explore</strong>
            <button onClick={() => navigate("home")}>Browse market</button>
            <button onClick={() => navigate("faq")}>FAQ</button>
            <button onClick={() => navigate("about")}>About us</button>
          </div>
          <div className="footer-column">
            <strong>Talk to us</strong>
            <button onClick={() => navigate("contact")}>Contact team</button>
            <a href="tel:+9411xxxxxxx">+94 11 xxx xxxx</a>
            <a href="mailto:hello@helag.lk">hello@helag.lk</a>
            <span>Mon–Fri, 9am–5pm</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 HelaG · Built for local livelihoods</span>
          <button className="footer-admin-link" onClick={openAdmin}>
            {isAdminAuthenticated
              ? "Open admin workspace"
              : "Administrator login"}
          </button>
        </div>
      </footer>
      {loginOpen && (
        <div
          className="login-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setLoginOpen(false)
          }
        >
          <form className="login-card" onSubmit={submitLogin}>
            <button
              type="button"
              className="login-close"
              onClick={() => setLoginOpen(false)}
              aria-label="Close login"
            >
              ×
            </button>
            <img
              className="brand-logo login-mark"
              src={logo}
              alt="HelaG"
            />
            <p className="eyebrow">RESTRICTED ACCESS</p>
            <h2>Welcome back.</h2>
            <p className="login-copy">
              Sign in to manage HelaG listings and locations.
            </p>
            <label>
              Username
              <input
                autoFocus
                required
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, username: event.target.value })
                }
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm({ ...loginForm, password: event.target.value })
                  }
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {showPassword ? (
                      <>
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </>
                    ) : (
                      <>
                        <path d="m3 3 18 18" />
                        <path d="M10.6 6.2A10.2 10.2 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3.1 3.8M6.2 6.8C3.8 8.2 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.4-.6" />
                      </>
                    )}
                  </svg>
                </button>
              </span>
            </label>
            {loginError && (
              <p className="login-error" role="alert">
                {loginError}
              </p>
            )}
            <button className="primary-button login-submit" type="submit">
              Sign in to admin
            </button>
            <p className="login-hint">For authorised coordinators only.</p>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
