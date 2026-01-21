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
        // Aplica patch para evitar erro de markedUnread antes de enviar
        await this.aplicarPatchMarkedUnread();
        
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
        // Tratamento específico para erro de markedUnread
        const errorMessage = sendError.message || sendError.toString();
        const isMarkedUnreadError = 
          errorMessage.includes('markedUnread') || 
          errorMessage.includes('Cannot read properties of undefined');
        
        // Se o erro for relacionado ao markedUnread, considera sucesso
        // pois a mensagem foi enviada, apenas o sendSeen falhou
        if (isMarkedUnreadError) {
          console.warn('Erro de markedUnread detectado (mensagem provavelmente enviada):', errorMessage);
          console.log('A mensagem foi enviada, mas houve erro ao marcar como lida. Continuando...');
          return true; // Considera sucesso pois a mensagem foi enviada
        }
        
        // Se o erro for relacionado ao serialize, tenta uma abordagem alternativa
        if (errorMessage.includes('serialize')) {
          console.warn('Erro de serialização detectado, tentando abordagem alternativa...');
          
          // Aguarda um pouco e tenta novamente
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            await this.aplicarPatchMarkedUnread();
            mensagemEnviada = await this.client.sendMessage(contatoFormatado, mensagem);
            console.log(`Mensagem enviada com sucesso (segunda tentativa) para ${contatoFormatado}`);
            return true;
          } catch (retryError) {
            const retryErrorMessage = retryError.message || retryError.toString();
            if (retryErrorMessage.includes('markedUnread')) {
              console.warn('Erro de markedUnread na segunda tentativa, mas mensagem enviada');
              return true;
            }
            console.error('Erro na segunda tentativa:', retryError);
            return false;
          }
        } else {
          throw sendError;
        }
      }
    } catch (error) {
      const errorMessage = error.message || error.toString();
      // Se for erro de markedUnread, considera sucesso
      if (errorMessage.includes('markedUnread') || 
          errorMessage.includes('Cannot read properties of undefined')) {
        console.warn('Erro de markedUnread no catch final, mas mensagem provavelmente enviada');
        return true;
      }
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }

  /**
   * Aplica um patch temporário para evitar erro de markedUnread
   * Este patch tenta inibir o sendSeen automático que causa o erro
   * Baseado na solução proposta para issue #5718 do whatsapp-web.js
   */
  private async aplicarPatchMarkedUnread(): Promise<void> {
    try {
      // Tenta acessar a página do Puppeteer através do cliente
      const page = (this.client as any).pupPage;
      if (page) {
        // Aplica o patch no contexto da página atual
        await page.evaluate(() => {
          try {
            // Sobrescreve o sendSeen para evitar erro de markedUnread
            if (typeof window !== 'undefined' && window.WWebJS && window.WWebJS.sendSeen) {
              const originalSendSeen = window.WWebJS.sendSeen;
              
              window.WWebJS.sendSeen = async function(...args: any[]) {
                try {
                  // Verifica se o objeto chat existe e tem a propriedade markedUnread
                  const chat = args[0];
                  if (chat && typeof chat === 'object' && 'markedUnread' in chat) {
                    return await originalSendSeen.apply(this, args);
                  } else {
                    // Se não tiver a estrutura esperada, ignora silenciosamente
                    // Isso evita o erro "Cannot read properties of undefined (reading 'markedUnread')"
                    return Promise.resolve();
                  }
                } catch (error) {
                  // Se der qualquer erro, ignora silenciosamente
                  // A mensagem já foi enviada, o erro é apenas na marcação de lida
                  return Promise.resolve();
                }
              };
            }
          } catch (e) {
            // Se não conseguir aplicar o patch, continua normalmente
            console.debug('Patch markedUnread não aplicado:', e);
          }
        });
      }
    } catch (error) {
      // Se não conseguir aplicar o patch, continua normalmente
      // O tratamento de erro no enviarMensagem vai lidar com isso
      console.debug('Não foi possível aplicar patch de markedUnread:', error.message);
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
