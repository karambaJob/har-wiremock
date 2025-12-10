import cors from 'cors';
import express from 'express';

/**
 * Настраивает middleware для Express приложения
 * @param {Object} app - Express приложение
 */
export function setupMiddleware(app) {
  // CORS middleware
  app.use(cors());
  
  // JSON body parser
  app.use(express.json());
}