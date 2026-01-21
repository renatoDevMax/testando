export const WhatsAppConfig = {
  // Configurações do Puppeteer
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-javascript',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
    ],
    executablePath: process.env.NODE_ENV === 'production' 
      ? '/usr/bin/google-chrome-stable' 
      : undefined,
  },

  // Configurações do WhatsApp Web
  // Removendo webVersion fixa para usar a versão mais recente automaticamente
  // Isso ajuda a evitar problemas de compatibilidade como o erro markedUnread
  webVersionCache: {
    type: 'local' as const,
    path: './.wwebjs_cache/',
    strict: false
  },

  // Configurações de autenticação
  authStrategy: {
    clientId: 'ecoClean-client'
  },

  // Configurações de retry
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2
  },

  // Configurações de timeout
  timeout: {
    connection: 30000,
    message: 15000,
    initialization: 60000
  }
}; 