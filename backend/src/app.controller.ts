import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  verificarSaude(): { status: string } {
    return { status: 'ok' };
  }
}
