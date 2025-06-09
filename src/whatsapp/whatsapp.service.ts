import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private client: Client;
  private qrCode: string | null = null;
  private isAuthenticated: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    // Configurações específicas para ambiente containerizado
    const chromeArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ];

    this.client = new Client({
      puppeteer: {
        headless: true,
        args: chromeArgs,
        executablePath:
          process.env.NODE_ENV === 'production'
            ? '/usr/bin/google-chrome-stable'
            : undefined,
      },
      authStrategy: new LocalAuth({ clientId: 'ecoClean-client' }),
    });

    this.setupEventListeners();
  }

  async onModuleInit() {
    try {
      await this.initializeClient();
    } catch (error) {
      console.error('Erro ao inicializar o cliente WhatsApp:', error);
    }
  }

  private async initializeClient() {
    if (this.isInitialized) return;

    try {
      this.isInitialized = true;
      await this.client.initialize();
    } catch (error) {
      this.isInitialized = false;
      console.error('Erro na inicialização do cliente WhatsApp:', error);
      throw error;
    }
  }

  private setupEventListeners() {
    this.client.on('qr', async (qr) => {
      console.log('QR Code recebido, gerando QR Code em base64...');
      try {
        this.qrCode = await qrcode.toDataURL(qr);
        this.isAuthenticated = false;
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
      }
    });

    this.client.on('ready', () => {
      console.log('Cliente WhatsApp está pronto!');
      this.isAuthenticated = true;
      this.qrCode = null;
    });

    this.client.on('authenticated', () => {
      console.log('Cliente WhatsApp autenticado!');
      this.isAuthenticated = true;
    });

    this.client.on('auth_failure', (error) => {
      console.error('Falha na autenticação do WhatsApp:', error);
      this.isAuthenticated = false;
    });

    this.client.on('disconnected', (reason) => {
      console.log('Cliente WhatsApp desconectado:', reason);
      this.isAuthenticated = false;
      this.qrCode = null;
    });
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAuthenticated: this.isAuthenticated,
      qrCode: this.qrCode,
    };
  }

  async getContatos() {
    if (!this.isAuthenticated) {
      console.error('Cliente WhatsApp não está autenticado');
      return { success: false, message: 'Não autenticado', contatos: [] };
    }

    try {
      const contatos = await this.client.getContacts();
      // Filtra apenas contatos que não são grupos e têm nome
      const contatosFiltrados = contatos
        .filter((contato) => !contato.isGroup && contato.name)
        .map((contato) => ({
          id: contato.id._serialized,
          nome: contato.name,
          numero: contato.number,
          isMyContact: contato.isMyContact,
        }));

      return {
        success: true,
        contatos: contatosFiltrados,
      };
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      return {
        success: false,
        message: 'Erro ao buscar contatos',
        contatos: [],
      };
    }
  }

  async getGrupos() {
    if (!this.isAuthenticated) {
      console.error('Cliente WhatsApp não está autenticado');
      return { success: false, message: 'Não autenticado', grupos: [] };
    }

    try {
      const contatos = await this.client.getContacts();
      // Filtra apenas os grupos
      const grupos = contatos
        .filter((contato) => contato.isGroup)
        .map((grupo) => ({
          id: grupo.id._serialized,
          nome: grupo.name,
        }));

      return {
        success: true,
        grupos: grupos,
      };
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      return {
        success: false,
        message: 'Erro ao buscar grupos',
        grupos: [],
      };
    }
  }

  async enviarMensagem(contato: string, mensagem: string): Promise<boolean> {
    // Verifica se o cliente está autenticado
    if (!this.isAuthenticated) {
      console.error('Cliente WhatsApp não está autenticado');
      return false;
    }

    try {
      // Verifica se é um ID de grupo (contém @g.us)
      if (contato.includes('@g.us')) {
        // Envia a mensagem diretamente para o grupo
        await this.client.sendMessage(contato, mensagem);
        console.log(`Mensagem enviada com sucesso para o grupo ${contato}`);
        return true;
      }

      // Se não for grupo, formata como número de telefone
      const contatoFormatado = this.formatarNumero(contato);

      // Envia a mensagem
      await this.client.sendMessage(contatoFormatado, mensagem);
      console.log(`Mensagem enviada com sucesso para ${contatoFormatado}`);
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }

  private formatarNumero(numero: string): string {
    // Remove qualquer caractere que não seja dígito
    const apenasDigitos = numero.replace(/\D/g, '');

    // Adiciona o prefixo '55' e sufixo '@c.us' caso não existam
    let numeroFormatado = apenasDigitos;

    // Verifica se já começa com '55', senão adiciona
    if (!numeroFormatado.startsWith('55')) {
      numeroFormatado = '55' + numeroFormatado;
    }

    // Adiciona o sufixo @c.us
    if (!numeroFormatado.endsWith('@c.us')) {
      numeroFormatado = numeroFormatado + '@c.us';
    }

    return numeroFormatado;
  }
}
