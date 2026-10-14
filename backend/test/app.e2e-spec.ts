import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Fluxo da triagem (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde ok', async () => {
    const resposta = await request(app.getHttpServer()).get('/health');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  it('GET /sessoes/:id com sessão inexistente responde 404', async () => {
    const resposta = await request(app.getHttpServer()).get(
      '/sessoes/nao-existe',
    );
    expect(resposta.status).toBe(404);
  });

  it('POST /sessoes/:id/mensagens com corpo inválido responde 400', async () => {
    const criada = await request(app.getHttpServer()).post('/sessoes').send();
    const resposta = await request(app.getHttpServer())
      .post(`/sessoes/${criada.body.id}/mensagens`)
      .send({});
    expect(resposta.status).toBe(400);
  });

  it('completa a triagem do início ao resumo do perfil', async () => {
    const criada = await request(app.getHttpServer()).post('/sessoes').send();
    expect(criada.status).toBe(201);
    expect(criada.body.status).toBe('em_andamento');
    expect(criada.body.perguntaAtual.id).toBe(1);

    const sessaoId = criada.body.id;

    const respostaInvalida = await request(app.getHttpServer())
      .post(`/sessoes/${sessaoId}/mensagens`)
      .send({ texto: 'opção inexistente' });
    expect(respostaInvalida.status).toBe(201);
    expect(respostaInvalida.body.perguntaAtual.id).toBe(1);
    expect(respostaInvalida.body.progresso.respondidas).toBe(0);

    const respostas = [
      'Jogos',
      '5000',
      'Nada',
      'AMD',
      'Prefiro discreto',
      'Margem para upgrade',
      'Já entendo o básico',
    ];

    let ultima = respostaInvalida;
    for (const texto of respostas) {
      ultima = await request(app.getHttpServer())
        .post(`/sessoes/${sessaoId}/mensagens`)
        .send({ texto });
      expect(ultima.status).toBe(201);
    }

    expect(ultima.body.status).toBe('concluida');
    expect(ultima.body.perguntaAtual).toBeNull();
    expect(ultima.body.perfil).toMatchObject({
      usoPrincipal: 'jogos',
      orcamentoTotal: 5000,
      possuiAtual: 'nada',
      preferenciaProcessador: 'amd',
      estetica: 'discreto',
      prioridade: 'margem_upgrade',
      nivelConhecimento: 'intermediario',
    });

    const consultada = await request(app.getHttpServer()).get(
      `/sessoes/${sessaoId}`,
    );
    expect(consultada.status).toBe(200);
    expect(consultada.body.status).toBe('concluida');
  });
});
