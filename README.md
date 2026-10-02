# API de Integração — Etiquetas de Produtos (Sankhya)

API em **NestJS** (TypeScript) que permite às transportadoras consultarem, por conta própria, as
etiquetas (de pedido e de volume) das cargas que vão transportar — dados que vêm do ERP
**Sankhya**, via **Oracle** (TypeORM).

- **Consulta (GET)** — fluxo principal e ativo hoje. Cada transportadora autentica com login e
  senha próprios e recebe só as cargas e etiquetas que são dela.
- **Envio (POST)** — fluxo secundário, mantido no código mas não usado no momento. Pensado para
  o Sankhya (ou um processo de disparo do lado dele) empurrar etiquetas para um sistema de
  destino externo, se um dia isso for necessário.

## Sumário

- [Arquitetura e fluxo](#arquitetura-e-fluxo)
- [Como rodar localmente](#como-rodar-localmente)
- [Configuração (.env)](#configuração-env)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
- [Formato de resposta do GET](#formato-de-resposta-do-get)
- [A consulta SQL](#a-consulta-sql)
- [Modo mock (sem Oracle)](#modo-mock-sem-oracle)
- [Scripts disponíveis](#scripts-disponíveis)
- [Solução de problemas](#solução-de-problemas)
- [Pendências / próximos passos](#pendências--próximos-passos)

---

## Arquitetura e fluxo

```
                    ┌──────────────────────────┐
  Transportadora ──▶│  GET /v1/etiquetas/      │
  (login/senha       │  carregamento            │──▶ Oracle (Sankhya)
   próprios)         │  (Basic Auth, filtra por │     via TypeORM
                     │   FROTA da credencial)   │
                     └──────────────────────────┘

                    ┌──────────────────────────┐
  Sankhya / job ───▶│  POST /v1/etiquetas      │
  de disparo         │  POST /v1/etiquetas/lote │──▶ Sistema de Destino
  (Bearer token)     │  (hoje inativo)          │     (externo)
                     └──────────────────────────┘
```

Stack: **NestJS** (via Nest CLI oficial) + **TypeORM** (driver `oracledb`, modo *thin*, sem
precisar de Oracle Instant Client) + **Swagger** (documentação interativa em `/docs`).

## Como rodar localmente

```bash
npm install
cp .env.example .env     # ajuste as variáveis — comece com DB_MODE=mock
npm run build
npm start
```

Para desenvolvimento (recompila e reinicia ao salvar um arquivo):
```bash
npm run start:dev
```

Documentação interativa (Swagger UI), com os dois esquemas de autenticação prontos pra testar
direto na página: **http://localhost:3000/docs**

## Configuração (`.env`)

O arquivo é carregado com **caminho absoluto**, calculado a partir de onde o app está rodando —
não importa de qual diretório você dispara o `npm start`. Ainda assim, ele precisa existir na
raiz do projeto (mesmo nível do `package.json`), com o nome exato `.env` (não `.env.example`).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | Não (padrão `3000`) | Porta HTTP da API |
| `DB_MODE` | Não (padrão `oracle`) | `oracle` conecta de verdade; `mock` serve dados de exemplo, sem precisar do banco |
| `ORACLE_CONNECT_STRING` | Recomendada | Connect string única, formato "Easy Connect": `host:porta/SERVICE_NAME` |
| `ORACLE_HOST` / `ORACLE_PORT` / `ORACLE_SID` / `ORACLE_SERVICE_NAME` | Alternativa | Campos separados, usados só se `ORACLE_CONNECT_STRING` estiver vazio |
| `ORACLE_USER` / `ORACLE_PASSWORD` | Sim (modo oracle) | Credenciais do banco |
| `ORACLE_LOGGING` | Não | `true` loga todo SQL executado pelo TypeORM |
| `AUTH_TOKENS` | Sim (se o envio for usado) | Tokens Bearer aceitos nos endpoints `POST` (Sankhya) |
| `TRANSPORTADORAS_CREDENCIAIS` | Sim | Credenciais Basic Auth das transportadoras — ver [Autenticação](#autenticação) |
| `DESTINO_BASE_URL` / `DESTINO_API_KEY` | Se o envio for usado | Configuração do Sistema de Destino (fluxo `POST`, hoje inativo) |
| `RATE_LIMIT_PER_MINUTE` | Não (padrão `120`) | Limite de requisições por minuto, por credencial |

Veja `.env.example` para o arquivo completo, comentado.

## Autenticação

A API usa **dois esquemas diferentes**, para dois públicos diferentes:

### Transportadoras → `GET` → HTTP Basic Auth

Cada transportadora tem login e senha próprios, além de um valor de **`FROTA`** — usado para
filtrar a consulta no Oracle (`FROTA LIKE '%<valor>%'` em `AD_CABCARREGAMENTO`), garantindo que
cada uma só veja as próprias cargas. Esse valor vem **sempre** da credencial autenticada, nunca
de um parâmetro que o cliente poderia manipular.

Configurado em `TRANSPORTADORAS_CREDENCIAIS`, formato `login:senha:FROTA:Nome Amigável`
(nome opcional), separado por vírgula para várias transportadoras:
```
TRANSPORTADORAS_CREDENCIAIS=transp-risso:senha123:RISSO:Transportadora Risso,transp-azul:senha456:AZUL:Transportadora Azul
```

Exemplo de chamada:
```bash
curl -u transp-risso:senha123 http://localhost:3000/v1/etiquetas/carregamento
```

⚠️ **Basic Auth só é seguro com HTTPS em produção** — login/senha vão em base64, que é
reversível, não criptografado.

### Sankhya → `POST` (fluxo inativo) → Bearer Token

```
Authorization: Bearer <token>
```
Tokens configurados em `AUTH_TOKENS` (lista separada por vírgula). Só é relevante se/quando o
fluxo de envio for ativado.

## Endpoints

| Método | Rota | Autenticação | Descrição | Status |
|---|---|---|---|---|
| `GET` | `/v1/etiquetas/carregamento` | Basic (transportadora) | Lista as cargas da transportadora autenticada, agrupadas por `chaveNfe` | **Ativo** |
| `POST` | `/v1/etiquetas` | Bearer (Sankhya) | Envia uma etiqueta ao Sistema de Destino | Mantido, inativo |
| `POST` | `/v1/etiquetas/lote` | Bearer (Sankhya) | Envia várias etiquetas em lote | Mantido, inativo |
| `GET` | `/health` | — | Health check | Ativo |
| `GET` | `/docs` | — | Swagger UI | Ativo |

Os endpoints `POST` também exigem o header `Idempotency-Key` (uma chave única por tentativa de
envio), para evitar duplicidade em reenvios.

## Formato de resposta do GET

```json
[
  {
    "ordemCarga": 165379,
    "chavesNfe": [
      {
        "chaveNfe": "35260948059343000158550010000806821094076554",
        "cnpj": "12345678912345",
        "numnota": 18955132,
        "serieNota": 3,
        "totalEtiquetas": 9,
        "etiquetas": [
          { "barCode": 5312513, "sequencia": 1 },
          { "barCode": 5312697, "sequencia": 2 },
          { "barCode": "VOL10939204", "sequencia": 3 },
          { "barCode": "VOL10939207", "sequencia": 4 },
          { "barCode": "VOL10939208", "sequencia": 5 },
          { "barCode": "VOL10939244", "sequencia": 6 },
          { "barCode": "VOL10939788", "sequencia": 7 },
          { "barCode": "VOL10939789", "sequencia": 8 },
          { "barCode": "VOL10939790", "sequencia": 9 }
        ]
      }
    ]
  }
]
```

Se a transportadora não tiver nenhuma carga, a resposta é `200` com lista vazia `[]`.

**Hierarquia:**
- **`ordemCarga`** — a ordem de carga/carregamento. Uma transportadora pode ter várias no mesmo
  período (por isso a resposta é uma lista).
- **`chavesNfe`** — dentro de cada ordem de carga, uma entrada por nota fiscal. Cada `chaveNfe`
  (chave de acesso da NF-e) corresponde a exatamente uma nota, por isso `cnpj`, `numnota` e
  `serieNota` aparecem como valores únicos, não como listas. Pedidos ainda não faturados (sem
  nota vinculada ainda) aparecem com `"chaveNfe": null`.
- **`totalEtiquetas`** — soma de todos os itens do array `etiquetas` daquela nota.
- **`etiquetas`** — array único contendo dois tipos de item, misturados:
  - **Pré-fatura**: `{ "barCode": <número>, "sequencia": <n> }` — identifica um item/produto do
    pedido antes de ser faturado (o antigo `idRev`).
  - **Pós-fatura**: `{ "barCode": <string>, "sequencia": <n> }` — identifica uma etiqueta de
    volume física, já gerada (o antigo `etqVol`, no formato `VOL...`).

  A diferença entre os dois tipos é o **tipo de dado** de `barCode` (número vs. string) — quem
  consome a API deve checar isso para saber qual dos dois casos está tratando.

  A numeração de `sequencia` é **contínua**: os itens pré-fatura vêm primeiro (1, 2, 3...), e os
  pós-fatura continuam a partir daí — não reinicia em 1.

## A consulta SQL

A consulta roda contra as tabelas do Sankhya:

- **`AD_CABCARREGAMENTO`** — cabeçalho da ordem de carga (`FROTA`, `DATA`, `STATUS`). É aqui que
  o filtro por transportadora (`FROTA LIKE '%...%'`) e por status (`STATUS = 'F2'`) acontece.
- **`AD_ITECARREGAMENTO`** — itens do pedido ainda não faturados (`IDREV`).
- **`AD_ITECARREGAMENTOVOL`** — etiquetas de volume já geradas (`ETQVOL`).
- **`AD_PEDCARREGAMENTO` → `TGFVAR` (`NUNOTAORIG`) → `TGFCAB`** — join que resolve `NUMNOTA`,
  `SERIENOTA` e `CHAVENFE` a partir do pedido/volume, tanto pros itens pré-fatura quanto pros
  pós-fatura (por isso os dois acabam batendo na mesma nota/chave quando aplicável).

Pontos que valem registrar:
- O filtro de `FROTA` é por **substring** (`LIKE '%...%'`) — duas transportadoras com nomes onde
  uma contém a outra (ex.: `RISSO` e `RISSOLOG`) podem ter sobreposição.
- A data está fixa em `TRUNC(DATA) = TRUNC(SYSDATE) - 1` (o dia anterior), combinada com
  `STATUS = 'F2'`. Se precisar virar configurável/dinâmico, isso vai exigir uma mudança de código.

## Modo mock (sem Oracle)

Útil para desenvolver/testar sem depender de acesso ao banco:
```
# .env
DB_MODE=mock
```
Serve dados de exemplo a partir de um CSV de amostra. Como esse CSV não tem todas as colunas
reais (`FROTA`, `DATA`, `STATUS`, `CHAVENFE`, `CNPJ` etc.), o modo mock não aplica esses filtros
e alguns campos vêm sempre nulos — a API avisa isso no log ao usar esse modo.

## Scripts disponíveis

| Script | O que faz |
|---|---|
| `npm run build` | Compila o projeto (`nest build`) |
| `npm start` | Roda a versão compilada (`dist/main.js`) |
| `npm run start:dev` | Modo desenvolvimento, recompila e reinicia ao salvar |
| `npm run check` | Só checa tipos TypeScript, sem gerar arquivos |
| `npm run test:agrupamento` | Testa a lógica de agrupamento isoladamente (sem precisar subir o servidor nem o Oracle) |
| `npm run docs:export` | Exporta a especificação OpenAPI gerada para `openapi.json` |

## Solução de problemas

Problemas reais que já apareceram e suas causas — deixado aqui para referência futura:

**Erro `NJS-503`, endereço `fe80::...` ou `127.0.0.1` ao conectar no Oracle**
Normalmente significa que `ORACLE_HOST`/`ORACLE_CONNECT_STRING` chegaram **vazios** ao driver —
ou seja, o `.env` não foi encontrado/carregado. A API loga isso claramente na inicialização,
dizendo se encontrou o arquivo `.env` ou não. Confirme que ele existe na raiz do projeto, com as
variáveis de fato preenchidas.

**Erro `ORA-12504` ("listener was not given the SERVICE_NAME")**
A conexão chegou no listener, mas faltou `SERVICE_NAME` (ou foi usado `SID` num banco que na
verdade exige `SERVICE_NAME` — comum em bancos com PDB/multitenant). Tente
`ORACLE_CONNECT_STRING=host:porta/SERVICE_NAME` com o nome do serviço, não o SID.

**`Cannot find module '@nestjs/common/internal'` ao rodar em modo dev**
Era um problema do `ts-node-dev` (pacote sem manutenção) com versões recentes do Node/NestJS —
resolvido ao migrar para o `nest start --watch` oficial.