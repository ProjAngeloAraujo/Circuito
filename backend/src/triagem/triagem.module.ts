import { Module } from '@nestjs/common';
import { TriagemService } from './triagem.service';

@Module({
  providers: [TriagemService],
  exports: [TriagemService],
})
export class TriagemModule {}
