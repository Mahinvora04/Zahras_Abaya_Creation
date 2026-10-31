# Authentication setup

The app supports email/password accounts and Google sign-in. Phone numbers are optional Indian contact numbers; they are stored as unverified and are not accepted as login identifiers.

## Google sign-in

1. In Google Auth Platform, create a **Web application** OAuth client and configure the consent screen.
2. Add the frontend origins to the OAuth client's authorized JavaScript origins. For local Vite development, use `http://localhost:5173` and, if used, `http://127.0.0.1:5173`. Add the production frontend origin before deploying.
3. Copy the same web client ID into `VITE_GOOGLE_CLIENT_ID` in `client/.env` and `GOOGLE_CLIENT_ID` in `server/.env`. Set `CORS_ORIGINS` in `server/.env` to the frontend origins, comma-separated. Start from the respective `.env.example` files. Keep client secrets out of frontend environment variables.
4. Install server requirements and restart the API; restart Vite after changing its environment file.

The client sends Google's signed ID token to `POST /api/auth/google`. FastAPI verifies its signature and audience, then creates or finds the MongoDB user and issues the app's existing HTTP-only session cookie. Google sign-in links to an existing account with the same verified email; the Google subject is stored as the stable provider identifier.

Existing accounts created with only a phone number have no email or Google identity to match. Those users cannot sign in with the new email or Google methods until an account recovery or migration process associates a verified email with their account.
