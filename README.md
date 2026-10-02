# API de Integração — Etiquetas de Produtos (Sankhya)

NestJS (Nest CLI oficial) + TypeORM (Oracle). Testada de ponta a ponta.

## Novidades desta versão

1. **Array único `etiquetas`** — `itens` (idRev) e `etiquetas` (etqVol) foram unidos num só
   array dentro de cada `chaveNfe`, misturando os dois tipos, com sequência contínua.
2. **`CNPJ` agora está no `SELECT`** (como literal `''` por enquanto, do seu lado) — o
   `normalizar()` já lê essa coluna, então quando o join/valor real for definido no banco, não
   precisa tocar em código nenhum aqui.

## Formato de resposta — atual

```
GET /v1/etiquetas/carregamento
Authorization: Basic base64(login:senha)
```

```json
[
  {
    "ordemCarga": 165379,
    "cnpj": null,
    "chavesNfe": [
      {
        "chaveNfe": "35260948059343000158550010000806821094076554",
        "numnota": 18955132,
        "serieNota": 3,
        "totalEtiquetas": 9,
        "etiquetas": [
          { "idRev": 5312513, "sequencia": 1 },
          { "idRev": 5312697, "sequencia": 2 },
          { "etqVol": "VOL10939204", "sequencia": 3 },
          { "etqVol": "VOL10939207", "sequencia": 4 },
          { "etqVol": "VOL10939208", "sequencia": 5 },
          { "etqVol": "VOL10939244", "sequencia": 6 },
          { "etqVol": "VOL10939788", "sequencia": 7 },
          { "etqVol": "VOL10939789", "sequencia": 8 },
          { "etqVol": "VOL10939790", "sequencia": 9 }
        ]
      }
    ]
  }
]
```

Isso reproduz exatamente o formato que você mandou: um array só (`etiquetas`), com itens de
`idRev` primeiro e `etqVol` depois, sequência contínua (1 a 9), e `totalEtiquetas: 9`.

No TypeScript, cada item do array é `{ idRev, sequencia }` **ou** `{ etqVol, sequencia }` (tipo
`ItemEtiqueta` em `etiquetas-agrupador.ts`) — então, se for consumir isso em código (não só
exibir), é só checar se o item tem `idRev` ou `etqVol` pra saber o tipo.

## `CNPJ`

Já está no `SELECT` (nos dois ramos do `UNION ALL`, como você mandou) e o `normalizar()` já lê
`l.CNPJ` normalmente. Hoje ainda vem sempre `null` na resposta porque a coluna está como literal
`''` na sua SQL — assim que o join/valor real for definido do lado do banco, a API já vai
refletir isso automaticamente, sem precisar de nenhuma mudança de código.

## SQL usada (implementada em `src/etiquetas/etiquetas-query.service.ts`)

A mesma estrutura de antes (`AD_ITECARREGAMENTO`/`AD_ITECARREGAMENTOVOL` → `AD_PEDCARREGAMENTO`
→ `TGFVAR` → `TGFCAB`), agora com `CNPJ` no `SELECT`. Filtro por `FROTA` (substring) e
`STATUS = 'F2'`, data fixa em `SYSDATE - 1`.

### ⚠️ Pontos em aberto, documentados mas não alterados

1. `FROTA LIKE '%...%'` é por substring.
2. Data fixa em `SYSDATE - 1` + `STATUS = 'F2'`.
3. **Modo mock** não tem `CHAVENFE`/`NUMNOTA`/`SERIENOTA`/`CNPJ` — só `IDREV`/`ETQVOL` reais; o
   resto cai em `null`, tudo num grupo só (`chaveNfe: null`). O array único com os dois tipos
   misturados foi testado com dados sintéticos (`npm run test:agrupamento`).

## Autenticação das transportadoras (via `FROTA`)

```
TRANSPORTADORAS_CREDENCIAIS=transp-risso:senha123:RISSO:Transportadora Risso,transp-outra:senha456:OUTRAFROTA:Outra Transportadora
```
⚠️ Basic Auth só é seguro com HTTPS em produção.

## Conexão com o Oracle

1. **`ORACLE_CONNECT_STRING`** (recomendada) — `host:porta/SERVICE_NAME`.
2. Campos separados: `ORACLE_HOST`, `ORACLE_PORT`, `ORACLE_SID` **ou** `ORACLE_SERVICE_NAME`.

## Modo mock (sem Oracle)

```
# .env
DB_MODE=mock
```

## Rodando localmente

```bash
npm install
cp .env.example .env   # comece com DB_MODE=mock
npm run build
npm start
npm run start:dev   # desenvolvimento, recompila ao salvar
```

Swagger UI: `http://localhost:3000/docs`
Testar só a lógica de agrupamento: `npm run test:agrupamento`

### Testando o envio (fluxo secundário) localmente

```bash
node mock-destino.js &   # destino falso na porta 4000
npm start
```

## Endpoints

| Método | Rota | Autenticação | Descrição | Status |
|---|---|---|---|---|
| GET | `/v1/etiquetas/carregamento` | Basic (transportadora, filtra por `FROTA`) | Lista as cargas da transportadora, agrupadas por `chaveNfe` | **Ativo** |
| POST | `/v1/etiquetas` | Bearer (Sankhya) | Envia uma etiqueta | Mantido, não ativo |
| POST | `/v1/etiquetas/lote` | Bearer (Sankhya) | Envia em lote | Mantido, não ativo |
| GET | `/health` | — | Health check | Ativo |
| GET | `/docs` | — | Swagger UI | Ativo |

## Próximos passos sugeridos

- [ ] Definir o valor/join real de `CNPJ` do lado do banco (código já está pronto pra receber)
- [ ] Testar a SQL contra o Oracle real (sem acesso a um aqui)
- [ ] Confirmar se `LIKE` por substring em `FROTA` é aceitável
- [ ] Confirmar se `SYSDATE - 1` e `STATUS = 'F2'` devem virar configuráveis
- [ ] Migrar credenciais das transportadoras para o banco (com senha com hash) antes de produção
- [ ] Confirmar HTTPS em produção (obrigatório com Basic Auth)
- [ ] Quando o envio for ativado: confirmar API real do Sistema de Destino
- [ ] Trocar idempotência/rate-limit em memória por Redis antes de produção
- [ ] Escrever testes automatizados (unitários + e2e com `@nestjs/testing`)
