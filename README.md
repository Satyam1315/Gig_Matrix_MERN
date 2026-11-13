# GiG Matrix (MERN)

GiG Matrix is a MERN rewrite of the original server-rendered PHP/MySQL project:

- **MongoDB / Mongoose** for accounts, profiles, jobs, applications, and messages
- **Express / Node.js** for the REST API, authentication, and uploads
- **React / Vite** for the web application

The unused PHP app and its static images have been removed. The MySQL importer remains available for moving existing records. Existing profile pictures remain in `uploads/` so imported profiles can continue to reference them. Run the Node app commands below to use the MERN version.

## Project layout

```text
backend/
  uploads/     Profile pictures and uploaded resumes
  config/       MongoDB connection
  middleware/   Authentication and authorization
  models/       Mongoose data models
  routes/       Express API routes
  utils/        Validation and MySQL import utility
  test/         Backend tests
  server.js     Express app entry point
frontend/
  src/
    components/ Shared UI components
    context/    Authentication context
    pages/      React routes and page views
    utils/      API client and formatting helpers
    App.jsx     Frontend entry component
    main.jsx    React bootstrap
  index.html
  vite.config.js
```

## Requirements

- Node.js 20 or newer
- MongoDB 6 or newer, local or hosted
- MySQL access to the existing GiG Matrix database only if importing old records

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` and replace `JWT_SECRET` with a random value of at least 32 characters.
3. Install and start the app:

   ```sh
   npm install
   npm run dev
   ```

4. Open <http://localhost:5173>. The API listens on <http://localhost:5001> (the port configured in `.env`).

## Sample data

With `MONGODB_URI` pointing to your development database and `NODE_ENV` not set to `production`, run:

```sh
npm run seed
```

The repeatable seed creates or updates demo accounts, profiles, three jobs, two applications, and a sample conversation. All demo accounts use the password `GigMatrixDemo2026!`:

- Project owner: `demo.developer@gigmatrix.test`
- Freelancer: `demo.freelancer@gigmatrix.test`
- Designer: `demo.designer@gigmatrix.test`

The seed command refuses to run when `NODE_ENV=production`. The sample credentials are public demo credentials and must not be used in a deployed environment.

For production, set `NODE_ENV=production`, set `CLIENT_ORIGIN` to the app origin, then run `npm run build` and `npm start`. Express serves the built React app and API from the same origin.

## Existing MySQL data

Back up the MySQL database and the `uploads/` directory before importing. The migration utility imports users, jobs, freelancer profiles, job applications, and messages. It supports the job-owner column named either `developer_id` or `client_id`; the current project files use both names. The source schema must include the `users` table. PHP bcrypt password hashes are retained so existing passwords remain usable.

Set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` in `.env`, along with `MONGODB_URI`, then run:

```sh
npm run migrate:mysql
```

The importer upserts records by their original numeric IDs, so rerunning it updates the same migrated records rather than creating another copy. Existing uploaded profile pictures are referenced at `/uploads/profile_pictures/`; keep `backend/uploads/` in place. The importer prints how many records were imported and reports applications it could not link to an imported user or job.

## Password reset email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Reset codes expire after five minutes and are stored as a keyed digest, not as plain text. If SMTP is not configured, the reset endpoint returns an explicit setup error.

## Implemented marketplace flows

- Freelancer and project-owner registration, sign-in, sign-out, and role-based pages
- Job browse/search/category filter, posting, editing, deletion, and status
- Freelancer applications with optional resume upload and application status tracking
- Application review and status changes by the project owner
- Freelancer/project-owner profiles and profile picture upload/removal
- Member-to-member messaging and conversation history
- Email OTP password reset

Uploaded files are stored locally in `backend/uploads/`. Use persistent storage or replace local uploads with object storage before deploying across multiple app instances.

The React app implements the original marketplace's core flows, but its current styling and page layouts are a redesign rather than a pixel-identical conversion of the PHP UI. Validate the migrated app against the original before replacing the legacy deployment.

## Checks

```sh
npm test
npm run build
```
