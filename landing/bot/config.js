'use strict';

const path = require('path');

module.exports = {
  BASE_URL:       'http://localhost:3000',
  PORT:           3000,
  RESTAURANT_ID:  1,

  // Usuarios creados por setup-bot-users.js
  CREDENTIALS: {
    owner:    { email: 'owner@bot.com',  password: 'BotMenuPro2026!', nombre: 'María Dueña' },
    cocinero: { email: 'cocina@bot.com', password: 'BotMenuPro2026!', nombre: 'Juan Cocina' },
    mozo:     { email: 'mozo@bot.com',   password: 'BotMenuPro2026!', nombre: 'Luis Mozo'   },
  },

  // Viewport mobile iPhone 14
  VIEWPORT: { width: 390, height: 844 },

  SCREENSHOTS_DIR: path.join(__dirname, 'output', 'screenshots'),
  OUTPUT_DIR:      path.join(__dirname, 'output'),
  ERRORS_DIR:      path.join(__dirname, 'errors'),
  ASSETS_DIR:      path.join(__dirname, 'assets'),

  // Tiempo de espera entre acciones (ms) — permite que las animaciones terminen
  STEP_DELAY: 600,
};
