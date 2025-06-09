import { Controller, Get, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';

interface MensagemDto {
  contato: string;
  mensagem: string;
}

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('contatos')
  async getContatos() {
    return this.whatsappService.getContatos();
  }

  @Get('grupos')
  async getGrupos() {
    return this.whatsappService.getGrupos();
  }

  @Post('/mensagem')
  async enviarMensagem(@Body() mensagemDto: MensagemDto) {
    const { contato, mensagem } = mensagemDto;
    const success = await this.whatsappService.enviarMensagem(
      contato,
      mensagem,
    );

    return { mensagemEnviada: success };
  }

  @Post('mensagemVenda')
  async enviarMensagemVenda(@Body() body: { mensagem: string }) {
    const grupoId = '120363402057047268@g.us';
    const mensagemEnviada = await this.whatsappService.enviarMensagem(
      grupoId,
      body.mensagem,
    );
    return { mensagemEnviada };
  }

  @Post('mensagemCadastro')
  async enviarMensagemCadastro(@Body() body: { mensagem: string }) {
    const grupoId = '120363418514145544@g.us';
    const mensagemEnviada = await this.whatsappService.enviarMensagem(
      grupoId,
      body.mensagem,
    );
    return { mensagemEnviada };
  }
}
