import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupMiddleware } from './middleware.js';
import swaggerRoutes from './routes/swagger.routes.js';
import harRoutes from './routes/har.routes.js';
import mappingsRoutes from './routes/mappings.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Setup middleware
setupMiddleware(app);

// Register routes
app.use('/api', swaggerRoutes);
app.use('/api', harRoutes);
app.use('/api', mappingsRoutes);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});

export default app;