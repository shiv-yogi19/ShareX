# ShareX Deployment Guide

ShareX is engineered for seamless, zero-cost static hosting on **GitHub Pages** and **Cloudflare Pages**, accompanied by a dedicated **Cloudflare Worker** for WebRTC signaling.

---

## 1. GitHub Pages (Frontend Hosting)

1. Create a GitHub repository (e.g., `sharex-p2p`).
2. Push the contents of the `SHAREX` directory to the repository `main` branch:
   ```bash
   git init
   git add .
   git commit -m "feat: initial ShareX production release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/sharex-p2p.git
   git push -u origin main
   ```
3. Navigate to **Settings → Pages** in your GitHub repository.
4. Under **Build and deployment**, select:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)`
5. Click **Save**. Your site will be live at `https://<your-username>.github.io/sharex-p2p/`.

---

## 2. Cloudflare Pages (Frontend Hosting)

1. Log into your Cloudflare Dashboard.
2. Navigate to **Workers & Pages → Create Application → Pages → Connect to Git**.
3. Select your repository.
4. Configure Build settings:
   - **Framework preset**: `None`
   - **Build command**: *(Leave blank)*
   - **Build output directory**: `/` (Root directory)
5. Click **Save and Deploy**.

---

## 3. Cloudflare Worker (Signaling Server)

To coordinate WebRTC peers across different networks without local bus fallback:

1. Install Wrangler CLI:
   ```bash
   pnpm add -g wrangler
   # or: npm install -g wrangler
   ```
2. Authenticate with Cloudflare:
   ```bash
   wrangler login
   ```
3. Navigate to the `worker/` directory:
   ```bash
   cd worker
   ```
4. Deploy the worker:
   ```bash
   wrangler deploy
   ```
5. Note your deployed worker URL (e.g., `https://sharex-signaling.<subdomain>.workers.dev`).
6. In the ShareX web application:
   - Click the **Settings** icon.
   - Enter your WebSocket endpoint: `wss://sharex-signaling.<subdomain>.workers.dev/ws` into the **Signaling Server Endpoint** field.
   - Settings are stored in your browser's `localStorage` and used for all future sessions.

---

## 4. Local Development Server

To run and test ShareX locally on your computer or mobile device:

```bash
# Python 3
python3 -m http.server 8080

# Or Node.js http-server
npx http-server -p 8080
```

Open `http://localhost:8080` in your web browser.
