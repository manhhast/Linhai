import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google OAuth Setup (Lazy initialization to prevent crash if env vars are missing)
  let oauth2Client: any = null;
  const getOAuth2Client = () => {
    if (!oauth2Client) {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set in environment variables.");
      }
      oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.APP_URL}/auth/callback`
      );
    }
    return oauth2Client;
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get Google Auth URL
  app.get("/api/auth/google/url", (req, res) => {
    try {
      const client = getOAuth2Client();
      const scopes = [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/gmail.readonly"
      ];
      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent"
      });
      res.json({ url });
    } catch (error) {
      console.error("Auth URL Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate auth URL" });
    }
  });

  // OAuth Callback
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const client = getOAuth2Client();
      const { tokens } = await client.getToken(code as string);
      // In a real app, you'd store these tokens in Firestore linked to the user
      // For this demo, we'll send them back to the client via postMessage
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("OAuth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Gmail API: List recent emails
  app.post("/api/gmail/list", async (req, res) => {
    const { tokens } = req.body;
    if (!tokens) return res.status(400).json({ error: "No tokens provided" });

    try {
      const client = getOAuth2Client();
      client.setCredentials(tokens);
      const gmail = google.gmail({ version: "v1", auth: client });

      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
        q: "is:unread"
      });

      const messages = response.data.messages || [];
      const detailedMessages = await Promise.all(
        messages.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!
          });
          const headers = detail.data.payload?.headers || [];
          const subject = headers.find(h => h.name === "Subject")?.value || "(No Subject)";
          const from = headers.find(h => h.name === "From")?.value || "(Unknown)";
          const date = headers.find(h => h.name === "Date")?.value || "";
          const snippet = detail.data.snippet || "";
          
          return { id: msg.id, subject, from, date, snippet };
        })
      );

      res.json({ messages: detailedMessages });
    } catch (error) {
      console.error("Gmail API Error:", error);
      res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
