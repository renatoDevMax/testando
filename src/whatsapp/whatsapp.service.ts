import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import { WhatsAppConfig } from './whatsapp.config';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private client: Client;
  private qrCode: string | null = null;
  private isAuthenticated: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.client = new Client({
      puppeteer: WhatsAppConfig.puppeteer,
      authStrategy: new LocalAuth(WhatsAppConfig.authStrategy),
      // webVersion removido para usar versão mais recente automaticamente
      webVersionCache: WhatsAppConfig.webVersionCache
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
      let contatoFormatado: string;
      let mensagemEnviada: Message;

      // Verifica se é um ID de grupo (contém @g.us)
      if (contato.includes('@g.us')) {
        contatoFormatado = contato;
      } else {
        // Se não for grupo, formata como número de telefone
        contatoFormatado = this.formatarNumero(contato);
      }

      // Envia a mensagem com tratamento de erro específico
      try {
        mensagemEnviada = await this.client.sendMessage(contatoFormatado, mensagem);
        
        // Verifica se a mensagem foi enviada corretamente
        if (mensagemEnviada && mensagemEnviada.id) {
          console.log(`Mensagem enviada com sucesso para ${contatoFormatado}`);
          return true;
        } else {
          console.warn('Mensagem enviada mas sem confirmação de ID');
          return true; // Considera sucesso mesmo sem ID
        }
      } catch (sendError) {
        // Se o erro for relacionado ao serialize, tenta uma abordagem alternativa
        if (sendError.message && sendError.message.includes('serialize')) {
          console.warn('Erro de serialização detectado, tentando abordagem alternativa...');
          
          // Aguarda um pouco e tenta novamente
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            mensagemEnviada = await this.client.sendMessage(contatoFormatado, mensagem);
            console.log(`Mensagem enviada com sucesso (segunda tentativa) para ${contatoFormatado}`);
            return true;
          } catch (retryError) {
            console.error('Erro na segunda tentativa:', retryError);
            return false;
          }
        } else {
          throw sendError;
        }
      }
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

  /**
   * Verifica a saúde do cliente WhatsApp
   */
  async verificarSaude(): Promise<{ saudavel: boolean; detalhes: string }> {
    try {
      if (!this.isAuthenticated) {
        return { saudavel: false, detalhes: 'Cliente não autenticado' };
      }

      // Verifica se o cliente está conectado
      const info = await this.client.info;
      if (!info) {
        return { saudavel: false, detalhes: 'Informações do cliente não disponíveis' };
      }

      return { saudavel: true, detalhes: 'Cliente funcionando normalmente' };
    } catch (error) {
      console.error('Erro ao verificar saúde do cliente:', error);
      return { saudavel: false, detalhes: `Erro: ${error.message}` };
    }
  }

  /**
   * Reinicializa o cliente em caso de problemas
   */
  async reinicializarCliente(): Promise<boolean> {
    try {
      console.log('Reinicializando cliente WhatsApp...');
      
      if (this.client) {
        await this.client.destroy();
      }
      
      this.isInitialized = false;
      this.isAuthenticated = false;
      this.qrCode = null;
      
      // Recria o cliente
      this.client = new Client({
        puppeteer: WhatsAppConfig.puppeteer,
        authStrategy: new LocalAuth(WhatsAppConfig.authStrategy),
        // webVersion removido para usar versão mais recente automaticamente
        webVersionCache: WhatsAppConfig.webVersionCache
      });

      this.setupEventListeners();
      await this.initializeClient();
      
      console.log('Cliente WhatsApp reinicializado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao reinicializar cliente:', error);
      return false;
    }
  }
}
