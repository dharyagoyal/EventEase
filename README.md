# EventEase — Event Management Platform

EventEase is a full-stack event management application built with the MERN stack. It allows users to discover events and register for available seats, while authenticated organizers can create and manage their events through a dedicated dashboard.

***Live Demo:** https://event-ease-three-tau.vercel.app/

**Backend API:** https://eventease-api-hyd3.onrender.com

**Repository:** https://github.com/dharyagoyal/EventEase

## Features

### Event Discovery and Registration
- Browse available events and view event details.
- Register for events using a name and email.
- Prevent duplicate registrations for the same event.
- Enforce event capacity and track remaining seats.
- Validate event details and registration requests.

### Organizer Dashboard
- Organizer login using JWT-based authentication.
- Create, edit, and delete events.
- View and remove attendees for events owned by the authenticated organizer.
- Real-time seat recalculation and capacity updates upon attendee removal.
- View and manage events associated with the logged-in organizer.
- Log out and protect dashboard routes from unauthenticated access.

### Security and Authorization
- Password hashing using bcrypt.
- JWT-based authentication with token expiration.
- Protected organizer management endpoints.
- Event ownership checks for updates, deletion, and attendee removal.
- Owner-only access to view and remove attendees.
- Input validation for event, attendee removal, and registration requests.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router, Axios, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Database hosting | MongoDB Atlas |

## Architecture

```text
                 ┌──────────────────────┐
                 │      React UI        │
                 │   Vite + Axios       │
                 └──────────┬───────────┘
                            │ HTTP / REST API
                            ▼
                 ┌──────────────────────┐
                 │    Express Server    │
                 │ Authentication       │
                 │ Authorization        │
                 │ Validation           │
                 └──────────┬───────────┘
                            │ Mongoose
                            ▼
                 ┌──────────────────────┐
                 │      MongoDB         │
                 │ Users, Events,       │
                 │ Registrations        │
                 └──────────────────────┘
```

## Project Structure

```text
eventease/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   ├── .env.example
│   └── package.json
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── routes/
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- A MongoDB database, such as MongoDB Atlas
- Git

### 1. Clone the repository

```bash
git clone https://github.com/dharyagoyal/EventEase.git
cd EventEase
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory using `.env.example` as a reference.

Configure the required environment variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_random_secret
CLIENT_URL=http://localhost:5173
```

Use the exact database variable name specified in `server/.env.example` if it differs from `MONGODB_URI`.

Generate a strong JWT secret locally rather than using the placeholder:

```bash
openssl rand -base64 48
```

Start the backend:

```bash
npm run dev
```

The API runs on `http://localhost:5000` by default.

### 3. Configure the frontend

Open a second terminal from the project root:

```bash
cd client
npm install
```

Create a `.env` file in `client/` using `.env.example` as a reference.

Configure the API base URL:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### 4. Organizer account

The frontend provides an organizer login screen (`/login`). To create an organizer account for local testing, send a `POST` request to the registration API endpoint with your test credentials:

```bash
curl -sS -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  --data '{"name":"Local Organizer","email":"organizer@example.com","password":"password123"}'
```

Once created, log in via the web interface at `http://localhost:5173/login` using your email and password to access the dashboard and manage events. Never commit real credentials or production secrets to the repository.

## API Documentation

The API uses the `/api/v1` prefix.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register an account |
| POST | `/auth/login` | Authenticate an organizer |

### Events

| Method | Endpoint | Access |
|---|---|---|
| GET | `/events` | Public |
| GET | `/events/:id` | Public |
| POST | `/events` | Authenticated organizer |
| PATCH | `/events/:id` | Authenticated owner |
| DELETE | `/events/:id` | Authenticated owner |
| POST | `/events/:id/register` | Public registration |
| GET | `/events/:id/attendees` | Authenticated event owner |
| DELETE | `/events/:id/attendees/:attendeeId` | Authenticated event owner |

### Health Check

```http
GET /api/health
```

Protected endpoints require a valid bearer token:

```http
Authorization: Bearer <JWT_TOKEN>
```

Requests without valid authentication are rejected. Authenticated users cannot modify another organizer's events or view another organizer's attendee list.

## Available Frontend Scripts

Run these commands from `client/`:

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the production frontend |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

The backend's available scripts are defined in `server/package.json`.

## Deployment

### Frontend — Vercel

Configure the production environment variable:

```env
VITE_API_URL=https://eventease-api-hyd3.onrender.com/api/v1
```

### Backend — Render

Configure the required backend environment variables:

- MongoDB connection string
- `JWT_SECRET`
- `CLIENT_URL=https://event-ease-three-tau.vercel.app`
- `PORT`, if required by the service configuration

Keep environment variables and credentials out of source control.

### Database — MongoDB Atlas

Configure database access for the backend deployment and use an appropriately restricted database user.

## Security Considerations

- Passwords are hashed before storage.
- JWTs expire and are required for protected organizer operations.
- Event ownership is checked server-side; frontend filtering alone is not relied upon for authorization.
- Attendee information is available only to the event's authenticated owner.
- Public event discovery and registration are separate from organizer management permissions.
- Frontend session storage is used for authentication state. A hardened production implementation could consider secure, HttpOnly cookies and additional security controls.
- Keep secrets out of Git and restrict database network access.

## Future Improvements

- Automated backend and frontend tests.
- Rate limiting and stronger abuse protection.
- Pagination and optimized database queries.
- Improved event search and filtering.
- More comprehensive deployment monitoring.
- Enhanced accessibility and mobile UI refinements.

## License

No license has been specified yet.
