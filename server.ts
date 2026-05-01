import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ElevenLabs Pronunciation Proxy
  app.get("/api/pronounce", async (req, res) => {
    const { text } = req.query;
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "XrExE9yKIg1WjnnlhkHG"; // Adam is default

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text parameter is required" });
    }

    if (!apiKey || apiKey === "your-api-key") {
      console.warn("ELEVENLABS_API_KEY is missing or using placeholder. Falling back to native synthesis.");
      return res.status(401).json({ error: "Cloud configuration required: Please add ELEVENLABS_API_KEY to secrets." });
    }

    try {
      console.log(`Generating audio for: "${text}" using voice: ${voiceId}`);
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (response.status === 401) {
        console.error("ElevenLabs Authentication failed. Check your API key in Secrets.");
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("ElevenLabs API Error:", response.status, errorData);
      }
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API responded with status ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      console.log("Audio generated successfully, size:", audioBuffer.byteLength);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength,
        "Cache-Control": "public, max-age=3600"
      });
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error("ElevenLabs proxy error:", error);
      res.status(500).json({ error: "Internal server error during audio generation" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
