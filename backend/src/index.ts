import http from 'http';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { initSocket } from './utils/socket.js';
import { ensureDefaultHostels } from './services/hostel.service.js';
import { seedDatabase } from './scripts/seed.js';

async function bootstrap() {
  try {
    const connectedUri = await connectDatabase();
    console.log(`[CampusCart] Connected to MongoDB replica set: ${connectedUri}`);

    await ensureDefaultHostels();

    if (env.NODE_ENV === 'development') {
      await seedDatabase({ forceReset: false });
    }

    const app = createApp();
    const server = http.createServer(app);
    initSocket(server);

    server.listen(env.PORT, () => {
      console.log(`[CampusCart] Backend API & Socket.IO listening on http://localhost:${env.PORT}`);
      console.log(`[CampusCart] Health check: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (err) {
    console.error('[CampusCart] Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();

