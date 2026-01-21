import {
  Controller,
  Get,
  Post,
  Render,
  Body,
  Res,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { DatabaseService } from './database/database.service';
import { ObjectId } from 'mongodb';

interface MensagemDto {
  contato: string;
  mensagem: string;
}

interface CompraDto {
  nome: string;
  valor: number;
  credito: number;
  statusCred: string;
  data: Date;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly whatsappService: WhatsAppService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  @Render('index')
  root() {
    return {};
  }

  @Post('mensagem')
  async enviarMensagem(@Body() mensagemDto: MensagemDto) {
    const { contato, mensagem } = mensagemDto;
    const success = await this.whatsappService.enviarMensagem(
      contato,
      mensagem,
    );

    return { mensagemEnviada: success };
  }

  @Get('whatsapp/saude')
  async verificarSaudeWhatsApp() {
    const saude = await this.whatsappService.verificarSaude();
    return saude;
  }

  @Post('whatsapp/reinicializar')
  async reinicializarWhatsApp() {
    const sucesso = await this.whatsappService.reinicializarCliente();
    return { reinicializado: sucesso };
  }

  @Post('adicionar-compra')
  async adicionarCompra(@Body() compraDto: CompraDto) {
    try {
      const connection = this.databaseService.getConnection();

      // Inserir o objeto na coleção comprasFidelidade
      const resultado = await connection
        .collection('comprasFidelidade')
        .insertOne(compraDto);

      // Verificar se a inserção foi bem-sucedida
      return { compraAdicionada: !!resultado.insertedId };
    } catch (error) {
      console.error('Erro ao adicionar compra:', error);
      return { compraAdicionada: false };
    }
  }

  @Get('todos')
  async buscarTodosClientes() {
    try {
      const connection = this.databaseService.getConnection();

      // Buscar todos os clientes filiados
      const clientesFiliados = await connection
        .collection('clienteFiliado')
        .find({})
        .project({ _id: 1, nome: 1 })
        .toArray();

      // Buscar todos os clientes matriz
      const clientesMatriz = await connection
        .collection('clienteMatriz')
        .find({})
        .project({ _id: 1, nome: 1 })
        .toArray();

      // Combinar as duas listas em uma única lista de clientes
      const todosClientes = [...clientesFiliados, ...clientesMatriz];

      // Converter ObjectId para string nos objetos retornados
      const clientesFormatados = todosClientes.map((cliente) => ({
        id: cliente._id.toString(),
        nome: cliente.nome,
      }));

      return clientesFormatados;
    } catch (error) {
      console.error('Erro ao buscar todos os clientes:', error);
      throw new Error('Erro ao buscar todos os clientes');
    }
  }

  @Get('compras/:nome')
  async buscarComprasPorNomeCliente(@Param('nome') nome: string) {
    try {
      const compras = await this.buscarComprasDoCliente(nome);

      if (!compras || compras.length === 0) {
        throw new NotFoundException(
          `Nenhuma compra encontrada para o cliente: ${nome}`,
        );
      }

      return {
        cliente: nome,
        quantidadeCompras: compras.length,
        compras: compras,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Erro ao buscar compras do cliente:', error);
      throw new Error(`Erro ao buscar compras para o cliente: ${nome}`);
    }
  }

  @Get('api/cliente/:id')
  async buscarClientePorId(@Param('id') id: string) {
    try {
      // Validar se o ID é válido para o MongoDB
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch (error) {
        throw new NotFoundException('ID de cliente inválido');
      }

      const connection = this.databaseService.getConnection();

      // Busca em ambas as coleções
      const clienteFiliado = await connection
        .collection('clienteFiliado')
        .findOne({ _id: objectId });

      if (clienteFiliado) {
        // Buscar compras do cliente
        const compras = await this.buscarComprasDoCliente(clienteFiliado.nome);
        return {
          cliente: clienteFiliado,
          compras: compras,
        };
      }

      const clienteMatriz = await connection
        .collection('clienteMatriz')
        .findOne({ _id: objectId });

      if (clienteMatriz) {
        // Buscar compras do cliente
        const compras = await this.buscarComprasDoCliente(clienteMatriz.nome);
        return {
          cliente: clienteMatriz,
          compras: compras,
        };
      }

      // Se não encontrar em nenhuma coleção
      throw new NotFoundException('Cliente não encontrado');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Cliente não encontrado');
    }
  }

  @Get('api/cliente/nome/:nome')
  async buscarClientePorNome(@Param('nome') nome: string) {
    try {
      const connection = this.databaseService.getConnection();

      // Busca em ambas as coleções usando o nome
      const clienteFiliado = await connection
        .collection('clienteFiliado')
        .findOne({ nome: nome });

      if (clienteFiliado) {
        // Buscar compras do cliente
        const compras = await this.buscarComprasDoCliente(clienteFiliado.nome);
        return {
          cliente: clienteFiliado,
          compras: compras,
        };
      }

      const clienteMatriz = await connection
        .collection('clienteMatriz')
        .findOne({ nome: nome });

      if (clienteMatriz) {
        // Buscar compras do cliente
        const compras = await this.buscarComprasDoCliente(clienteMatriz.nome);
        return {
          cliente: clienteMatriz,
          compras: compras,
        };
      }

      // Se não encontrar em nenhuma coleção
      throw new NotFoundException('Cliente não encontrado');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Cliente não encontrado');
    }
  }

  @Get('resgatar/:id')
  async resgatarCompras(@Param('id') id: string) {
    try {
      // Validar se o ID é válido para o MongoDB
      let objectId: ObjectId;
      try {
        objectId = new ObjectId(id);
      } catch (error) {
        return { credResgate: false };
      }

      const connection = this.databaseService.getConnection();

      // Primeiro, buscar o cliente pelo ID
      const clienteFiliado = await connection
        .collection('clienteFiliado')
        .findOne({ _id: objectId });

      let nomeCliente: string;

      if (clienteFiliado) {
        nomeCliente = clienteFiliado.nome;
      } else {
        const clienteMatriz = await connection
          .collection('clienteMatriz')
          .findOne({ _id: objectId });

        if (clienteMatriz) {
          nomeCliente = clienteMatriz.nome;
        } else {
          return { credResgate: false };
        }
      }

      // Buscar todas as compras do cliente com status "aberto"
      const compras = await connection
        .collection('comprasFidelidade')
        .find({ nome: nomeCliente, statusCred: 'aberto' })
        .toArray();

      if (!compras || compras.length === 0) {
        return { credResgate: false };
      }

      const agora = new Date();
      const vinteQuatroHorasAtras = new Date(
        agora.getTime() - 24 * 60 * 60 * 1000,
      );
      const trintaDiasAtras = new Date(
        agora.getTime() - 30 * 24 * 60 * 60 * 1000,
      );

      // Filtrar compras por data (mais de 24h e menos de 30 dias)
      const comprasParaAtualizar = compras.filter((compra) => {
        const dataCompra = new Date(compra.data);
        return (
          dataCompra < vinteQuatroHorasAtras && dataCompra > trintaDiasAtras
        );
      });

      if (comprasParaAtualizar.length === 0) {
        return { credResgate: false };
      }

      // Atualizar status para "resgatado"
      const idsParaAtualizar = comprasParaAtualizar.map((compra) => compra._id);
      const resultado = await connection
        .collection('comprasFidelidade')
        .updateMany(
          { _id: { $in: idsParaAtualizar } },
          { $set: { statusCred: 'resgatado' } },
        );

      // Retornar sucesso se pelo menos uma compra foi atualizada
      return { credResgate: resultado.modifiedCount > 0 };
    } catch (error) {
      console.error('Erro ao resgatar compras:', error);
      return { credResgate: false };
    }
  }

  private async buscarComprasDoCliente(nomeCliente: string) {
    try {
      const connection = this.databaseService.getConnection();
      const compras = await connection
        .collection('comprasFidelidade')
        .find({ nome: nomeCliente })
        .toArray();

      return compras;
    } catch (error) {
      console.error('Erro ao buscar compras do cliente:', error);
      return [];
    }
  }
}
