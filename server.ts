import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy Binance API to avoid CORS
  app.get("/api/binance/klines", async (req, res) => {
    try {
      const { symbol, interval, limit } = req.query;
      const response = await axios.get("https://api.binance.com/api/v3/klines", {
        params: { symbol, interval, limit },
      });
      res.json(response.data);
    } catch (error) {
      console.error("Binance API error:", error);
      res.status(500).json({ error: "Failed to fetch data from Binance" });
    }
  });

  app.get("/api/binance/ticker", async (req, res) => {
    try {
      const { symbol } = req.query;
      const response = await axios.get("https://api.binance.com/api/v3/ticker/price", {
        params: { symbol },
      });
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price" });
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
