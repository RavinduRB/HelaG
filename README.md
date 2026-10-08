<div align="center">
   <img src="https://raw.githubusercontent.com/RavinduRB/HelaG/main/public/helag-logo-192.png" alt="HelaG logo" width="120" />

   # HelaG

   **Local goods, closer to you.**

   Discover fresh produce and small businesses across Sri Lanka, then connect directly with the people behind every listing.

   [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232A)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) [![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/) [![Sri Lanka](https://img.shields.io/badge/made_for-Sri_Lanka-009B77)](https://github.com/RavinduRB/HelaG)
</div>

<br />

HelaG is a Progressive Web App that helps buyers discover fresh produce and small businesses across Sri Lanka. Local coordinators collect seller information through phone calls or SMS, verify it, and publish listings to the buyer map. Buyers contact sellers directly by phone or SMS to arrange orders, payment, pickup, or delivery.

HelaG does not process payments or require farmers and small businesses to register themselves online.

## 🌱 Features

### 🛒 Buyer experience

- Interactive OpenStreetMap map of Sri Lanka
- Search by business name, product, or town
- Filters for vegetables, fruits, grains, and spices
- Listing details including price, quantity, availability, pickup point, delivery areas, and preferred delivery days
- Availability states: available, low stock, sold out, and temporarily unavailable
- Direct phone and SMS actions for contacting sellers
- Public 1-to-5-star seller ratings
- Browser location detection and distance from the buyer
- One-kilometre nearby-business highlighting
- Shortest driving route to a selected business through the OSRM routing service
- About, FAQ, and Contact pages
- English, Sinhala, and Tamil buyer content

### 🧭 Administrator workspace

- Server-side administrator login with bcrypt password hashing
- HTTP-only, MongoDB-backed sessions
- Searchable listing directory
- Create, edit, and delete listing operations
- Coordinates for map placement, with optional GPS metadata extraction from uploaded images
- Image URL support and JPEG, PNG, or WebP uploads
- Mobile camera capture support where the browser provides it
- Client-side and server-side image validation
- Listing metrics and category coverage
- Demand signals from searches, category selections, and seller contact actions
- Date-filtered district and seller-interest analytics
- CSV export of coordinator listing data
- Notifications for listing updates, sign-in, sign-out, and errors
- Confirmation before deleting listings
- Offline create and edit queue with automatic synchronization after connectivity returns

### 📱 Offline and installable PWA

- Installable on supported Android and iOS browsers
- Cached application shell and static assets
- Cached business-listing API responses for offline browsing
- Offline status and cached-listing indicators
- In-app install prompt when supported by the browser
- Web App Manifest with HelaG icons and mobile metadata

## ⚙️ Technology

### 🎨 Frontend

- React 19 and React DOM
- Vite
- React Leaflet and Leaflet
- OpenStreetMap tiles
- OSRM routing API
- Responsive CSS
- Browser Geolocation, File, Canvas, and PWA APIs
- Service Worker and Web App Manifest

### 🛡️ Backend

- Node.js and Express
- MongoDB Atlas with Mongoose
- REST API
- `bcrypt` password hashing
- `express-session` with `connect-mongo`
- `helmet` security headers
- `express-rate-limit` request throttling
- CORS and environment configuration with `dotenv`
- `image-size` for uploaded-image dimension validation
- `exifr` for reading optional image GPS metadata in the frontend

## 🗂️ Project structure

```text
.
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── helag-logo-192.png
│   └── helag-logo-512.png
├── server/
│   ├── index.js
│   └── models/
│       ├── Admin.js
│       └── Business.js
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── crud.css
│   ├── i18n.js
│   ├── infoContent.js
│   ├── index.css
│   ├── main.jsx
│   └── page-transition.css
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## ✅ Requirements

- Node.js 20 or newer recommended
- npm
- MongoDB Atlas account and cluster
- A modern browser with JavaScript, geolocation, and PWA support

## 🚀 Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`.

3. Add your MongoDB Atlas connection string and strong administrator credentials:

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/helaharvest?retryWrites=true&w=majority
   MONGODB_DB=helaharvest
   PORT=4000
   CLIENT_ORIGIN=http://localhost:5173
   SESSION_SECRET=replace-with-a-long-random-secret
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=replace-with-a-strong-initial-password
   ```

   URL-encode special characters in the MongoDB password. Never commit `.env`, credentials, or a connection string.

4. In MongoDB Atlas, allow the development machine's IP address under **Network Access**.

## 💻 Run locally

Start the API in one terminal:

```bash
npm run server
```

Start the Vite development server in another terminal:

```bash
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` requests to `http://localhost:4000`.

When the database has no businesses, the API seeds four sample listings. The first startup creates the administrator configured by `ADMIN_USERNAME` and `ADMIN_PASSWORD`; existing administrators are not overwritten.

## 📜 Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run server` | Start the Express and MongoDB API |
| `npm run build` | Create a production frontend build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## 🔌 API endpoints

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Check API availability |
| `GET` | `/api/auth/session` | Session | Check the current administrator session |
| `POST` | `/api/auth/login` | Public | Start an administrator session |
| `POST` | `/api/auth/logout` | Session | End the current administrator session |
| `GET` | `/api/businesses` | Public | List businesses |
| `POST` | `/api/businesses` | Administrator | Create a listing |
| `PUT` | `/api/businesses/:id` | Administrator | Update a listing |
| `DELETE` | `/api/businesses/:id` | Administrator | Delete a listing |
| `POST` | `/api/businesses/:id/ratings` | Public | Add a whole-number rating from 1 to 5 |

## 🖼️ Listing and image rules

Each listing requires a name, location, category, product, price, quantity, phone number, initials, and valid `[latitude, longitude]` coordinates. Categories are limited to Vegetables, Fruits, Grains, and Spices.

Uploaded images must be JPEG, PNG, or WebP files smaller than 5 MB, with dimensions between 100px and 4096px. The frontend may compress larger images to WebP before submission. Images can also be supplied as HTTPS URLs.

## ☁️ Production and deployment

Build the frontend with:

```bash
npm run build
```

Use `npm run preview` for a local production preview. In production, serve the built frontend and API over HTTPS, set `NODE_ENV=production`, configure `CLIENT_ORIGIN` to the deployed frontend origin, and use a strong `SESSION_SECRET` and administrator password.

The service worker and install prompt require `localhost` or HTTPS. Opening `index.html` directly from the file system does not enable PWA installation or service-worker behavior.

### AWS deployment with a container

The included `Dockerfile` builds the React frontend and runs it from the same Express service as the API. This is suitable for AWS App Runner, ECS, or a small EC2 deployment.

1. Create a MongoDB Atlas production database and allow the AWS service to connect to it.
2. Build and test the container locally:

   ```bash
   docker build -t helag .
   docker run --env-file .env -p 4000:4000 helag
   ```

3. Push the image to Amazon ECR, then deploy it to App Runner or ECS.
4. Configure these environment variables in AWS: `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `CLIENT_ORIGIN`, and `NODE_ENV=production`.
5. Set `CLIENT_ORIGIN` to the final HTTPS application URL and use the platform-provided `PORT` value.

The production container serves the frontend and API from one origin, so browser sessions and `/api` requests continue to work without a separate frontend proxy.

## 📡 Offline behavior and limitations

- Cached listings can be viewed when the API or network is unavailable.
- Authentication session endpoints are never cached by the service worker.
- New and edited administrator listings are stored in a browser-local queue and replayed after the administrator signs in and connectivity returns.
- Ratings require an online API request.
- Map tiles, OSRM routes, and remote product images require network access unless the browser has already cached them.
- Image data is currently stored with listings. For larger production deployments, use object storage such as Cloudinary or Amazon S3.
- MongoDB Atlas must be reachable for administrator login and server synchronization.

## 🔒 Security notes

Administrator passwords are stored as bcrypt hashes and are never returned to the browser. Authentication uses a server-side session stored in MongoDB and an HTTP-only, same-site cookie.

The API includes Helmet security headers, a restrictive content security policy, and rate limits on sensitive public endpoints:

- Login attempts are limited to 10 requests per IP address every 15 minutes.
- Public ratings are limited to 30 requests per IP address every 15 minutes.
- Listing create and update requests accept only documented listing fields.
- API error responses do not expose raw database or server exception messages.
- Remote listing images must use HTTPS URLs.

Keep all environment secrets outside source control, use HTTPS in production, and restrict MongoDB Network Access. The rate limiter uses in-memory storage for a single server instance. Multi-instance deployments should configure a shared rate-limit store such as Redis.
