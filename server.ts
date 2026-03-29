import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
<<<<<<< HEAD
import { createProxyMiddleware } from 'http-proxy-middleware';
=======
import axios from "axios";
>>>>>>> 3b761e54730de8dd4994ae15110ee319591e2a97

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy Binance API to avoid CORS
<<<<<<< HEAD
  app.use('/api/binance', createProxyMiddleware({
    target: 'https://api.binance.com/api/v3',
    changeOrigin: true,
    pathRewrite: {
      '^/api/binance': '', // Ensure the prefix is removed if it's still there
    },
    on: {
      proxyReq: (proxyReq) => {
        // Use a real browser User-Agent
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        proxyReq.setHeader('Accept', 'application/json');
        // Strip headers that might trigger bot detection or CORS issues on the target
        proxyReq.removeHeader('Origin');
        proxyReq.removeHeader('Referer');
        proxyReq.removeHeader('X-Forwarded-For');
        proxyReq.removeHeader('X-Real-IP');
      },
      proxyRes: (proxyRes) => {
        if (proxyRes.statusCode !== 200) {
          console.log(`Binance Proxy Response: ${proxyRes.statusCode} for ${proxyRes.statusMessage}`);
        }
      }
    }
  }));

  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
=======
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
>>>>>>> 3b761e54730de8dd4994ae15110ee319591e2a97
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
