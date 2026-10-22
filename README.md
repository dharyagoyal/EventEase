# EventEase

EventEase is a full-stack event management application built with the MERN stack. Users can discover events, register for available seats, and manage events through an organizer dashboard.

## Features

- Browse available events and view event details
- Register for events using a name and email
- Prevent duplicate registrations for the same event
- Enforce event capacity and track remaining seats
- Create, edit, and delete events
- View event attendees
- Validate event details and registration requests

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Axios
- CSS

### Backend
- Node.js
- Express
- MongoDB
- Mongoose

## Project Structure

```text
eventease/
├── client/          # React frontend
│   ├── src/
│   └── .env.example
├── server/          # Express API
│   ├── src/
│   └── .env.example
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js and npm
- A MongoDB database, such as MongoDB Atlas

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd eventease
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file using `.env.example` as a reference and provide your MongoDB connection string.

Start the backend:

```bash
npm run dev
```

The API runs on port `5000` by default.

### 3. Configure the frontend

Open another terminal from the project root:

```bash
cd client
npm install
```

Create a `.env` file using `.env.example` as a reference.

Start the frontend:

```bash
npm run dev
```

Vite will display the local URL, usually `http://localhost:5173`.

## API Endpoints

Base URL: `/api/v1/events`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List events |
| GET | `/:id` | Get event details |
| POST | `/` | Create an event |
| PATCH | `/:id` | Update an event |
| DELETE | `/:id` | Delete an event |
| POST | `/:id/register` | Register for an event |
| GET | `/:id/attendees` | List event attendees |

Health check: `GET /api/health`

## Available Frontend Scripts

Run these commands inside `client/`:

- `npm run dev` — Start the development server
- `npm run build` — Build for production
- `npm run lint` — Run ESLint
- `npm run preview` — Preview the production build

## Security Notes

- Never commit real `.env` files, database credentials, or API secrets.
- The current application is a prototype. Organizer management endpoints do not yet have authentication or authorization, so they should not be exposed publicly with sensitive data.
- Configure production environment variables and restrict database network access before deployment.

## License

No license has been specified yet.
