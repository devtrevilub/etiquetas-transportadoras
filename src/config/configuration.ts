export interface CredencialTransportadora {
  login: string;
  senha: string;
  frota: string;
  nome: string;
}

/**
 * Formato: "login:senha:FROTA:Nome Amigável,login2:senha2:FROTA2:Nome Amigável 2"
 * (o "Nome Amigável" é opcional — se omitido, usamos o valor de FROTA como nome).
 *
 * `frota` é o valor usado no filtro `FROTA LIKE '%<frota>%'` da tabela
 * AD_CABCARREGAMENTO — é ele que garante que cada transportadora só veja as
 * próprias etiquetas. Vem da credencial autenticada, nunca de um parâmetro
 * que o cliente possa escolher.
 *
 * ⚠️ O filtro usa LIKE com '%' dos dois lados (substring, não igualdade
 * exata) — se duas transportadoras tiverem nomes onde uma contém a outra
 * (ex.: "RISSO" e "RISSOLOG"), pode haver sobreposição. Confirmar com o
 * negócio se isso é aceitável.
 */
function parseTransportadoras(raw: string | undefined): CredencialTransportadora[] {
  return (raw || '')
    .split(',')
    .map((par) => par.trim())
    .filter(Boolean)
    .map((par) => {
      const [login, senha, frota, nome] = par.split(':').map((s) => s?.trim());
      return { login, senha, frota, nome: nome || frota || login };
    })
    .filter((c) => c.login && c.senha && c.frota);
}

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),

  auth: {
    // Tokens válidos vindos do Sistema de Origem (Sankhya / processo de disparo)
    // — usados apenas nos endpoints de ENVIO (POST), hoje inativos.
    // TODO: substituir por validação OAuth2 client_credentials ou JWT assinado em produção.
    validTokens: (process.env.AUTH_TOKENS || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),

    // Credenciais (login/senha) de cada transportadora — usadas no endpoint
    // de CONSULTA (GET), via HTTP Basic Auth.
    // TODO produção: mover para tabela no banco com senha com hash (bcrypt),
    // em vez de variável de ambiente em texto puro.
    transportadoras: parseTransportadoras(process.env.TRANSPORTADORAS_CREDENCIAIS),
  },

  destino: {
    baseUrl: process.env.DESTINO_BASE_URL || '',
    apiKey: process.env.DESTINO_API_KEY || '',
    timeoutMs: parseInt(process.env.DESTINO_TIMEOUT_MS || '8000', 10),
    maxRetries: parseInt(process.env.DESTINO_MAX_RETRIES || '3', 10),
    retryBaseDelayMs: parseInt(process.env.DESTINO_RETRY_BASE_DELAY_MS || '300', 10),
  },

  rateLimit: {
    perMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '120', 10),
  },

  database: {
    // 'oracle' (padrão) conecta de verdade no Oracle via TypeORM.
    // 'mock' serve os dados de src/etiquetas/mock-data.json — útil para
    // desenvolver/testar sem acesso ao banco do Sankhya ainda.
    mode: process.env.DB_MODE || 'oracle',

    // OPÇÃO 1 (recomendada/mais simples): uma connect string única, no
    // formato Oracle "Easy Connect" — host:porta/SERVICE_NAME (ou
    // host:porta:SID, se o banco usar SID). Se preenchida, os campos
    // separados abaixo (host/port/sid/serviceName) são ignorados.
    // Ex.: ORACLE_CONNECT_STRING=10.140.1.131:1521/snkdbprd
    connectString: process.env.ORACLE_CONNECT_STRING || undefined,

    // OPÇÃO 2: campos separados (usados só se ORACLE_CONNECT_STRING vazio).
    host: process.env.ORACLE_HOST || '',
    port: parseInt(process.env.ORACLE_PORT || '1521', 10),
    // Usar SID ou serviceName, conforme o que o DBA fornecer (não os dois).
    // ⚠️ Erro ORA-12504 costuma significar que o banco exige SERVICE_NAME
    // (comum em bancos com PDB/multitenant) e não SID — tente trocar.
    sid: process.env.ORACLE_SID || undefined,
    serviceName: process.env.ORACLE_SERVICE_NAME || undefined,

    username: process.env.ORACLE_USER || '',
    password: process.env.ORACLE_PASSWORD || '',
    logging: process.env.ORACLE_LOGGING === 'true',
  },
});
