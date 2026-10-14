import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TriagemService } from '../triagem/triagem.service';
import { EnviarRespostaDto } from './dto/enviar-resposta.dto';
import { paraRespostaDto } from './sessao.mapper';
import { SessaoRespostaDto } from './sessao.types';
import { SessoesService } from './sessoes.service';

@Controller('sessoes')
export class SessoesController {
  constructor(
    private readonly sessoesService: SessoesService,
    private readonly triagemService: TriagemService,
  ) {}

  @Post()
  criar(): SessaoRespostaDto {
    const sessao = this.sessoesService.criarSessao();
    return paraRespostaDto(sessao, this.triagemService);
  }

  @Get(':id')
  obter(@Param('id') id: string): SessaoRespostaDto {
    const sessao = this.sessoesService.obterSessao(id);
    return paraRespostaDto(sessao, this.triagemService);
  }

  @Post(':id/mensagens')
  responder(
    @Param('id') id: string,
    @Body() corpo: EnviarRespostaDto,
  ): SessaoRespostaDto {
    const sessao = this.sessoesService.responder(id, corpo.texto);
    return paraRespostaDto(sessao, this.triagemService);
  }
}
