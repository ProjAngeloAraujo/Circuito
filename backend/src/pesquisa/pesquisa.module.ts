import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { PesquisaController } from './pesquisa.controller';
import { PesquisaService } from './pesquisa.service';

@Module({
  controllers: [PesquisaController],
  providers: [PesquisaService, AnthropicService],
})
export class PesquisaModule {}
