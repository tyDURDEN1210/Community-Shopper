import http from 'http';
import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env, validateProductionEnv } from './config/env.js';
import { initSocket } from './utils/socket.js';
import { ensureDefaultHostels } from './services/hostel.service.js';
import { seedDatabase } from './scripts/seed.js';

async function bootstrap() {
  try {
    validateProductionEnv();

    const connectedUri = await connectDatabase();
    console.log(
      `[CampusCart] Connected to MongoDB (${env.IS_PRODUCTION ? 'production' : connectedUri})`
    );

    await ensureDefaultHostels();

    if (env.NODE_ENV === 'development') {
      await seedDatabase({ forceReset: false });
    }

    const app = createApp();
    const server = http.createServer(app);
    initSocket(server);

    const port = Number(process.env.PORT) || env.PORT || 5000;
    const host = '0.0.0.0';

    server.listen(port, host, () => {
      console.log(`[CampusCart] Server listening on http://${host}:${port}`);
      console.log(`[CampusCart] Health check: http://${host}:${port}/api/v1/health`);
    });
  } catch (err) {
    console.error('[CampusCart] Fatal startup error:', err);
    process.exit(1);
  }
}

bootstrap();
