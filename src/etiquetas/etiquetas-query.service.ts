import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { agruparPorOrdemCarga, LinhaOrigem, OrdemCargaAgrupada } from './etiquetas-agrupador';

@Injectable()
export class EtiquetasQueryService {
  private readonly logger = new Logger(EtiquetasQueryService.name);

  constructor(@Optional() @InjectDataSource() private readonly dataSource?: DataSource) {}

  /**
   * @param frota valor usado no filtro `FROTA LIKE '%<frota>%'` — SEMPRE
   *   derivado da credencial autenticada (ver BasicAuthGuard), nunca de um
   *   parâmetro vindo do cliente.
   *
   * Retorna uma LISTA de ordens de carga (uma transportadora pode ter várias
   * cargas no mesmo dia), cada uma agrupada por chave de NF-e (cada chave
   * já corresponde a uma única nota — numnota/serieNota) e, dentro dela, um
   * único array `etiquetas` misturando itens (idRev) e etiquetas de volume
   * (etqVol), com sequência contínua entre os dois.
   */
  async buscarPorTransportadora(frota: string): Promise<OrdemCargaAgrupada[]> {
    const linhas = this.dataSource ? await this.buscarViaOracle(frota) : [];

    return agruparPorOrdemCarga(linhas);
  }

  private async buscarViaOracle(frota: string): Promise<LinhaOrigem[]> {
    const sql = `
      SELECT DISTINCT
          ORDEMCARGA,
          IDREV,
          NUMNOTA,
          ETQVOL,
          CHAVENFE,
          SERIENOTA,
          CNPJ
      FROM (
          SELECT DISTINCT
              ITE.ORDEMCARGA,
              ITE.IDREV,
              NFE.NUMNOTA,
              NULL AS ETQVOL,
              NFE.SERIENOTA,
              NVL(NFE.CHAVENFE, '') AS CHAVENFE,
              PAR.CGC_CPF AS CNPJ
          FROM AD_ITECARREGAMENTO ITE
            LEFT JOIN AD_PEDCARREGAMENTO PED ON PED.NUMNOTA = ITE.NUMPEDIDO
            LEFT JOIN TGFVAR VAR ON PED.NUNOTA = VAR.NUNOTAORIG
            LEFT JOIN TGFCAB NFE ON NFE.NUNOTA = VAR.NUNOTA
            LEFT JOIN TGFPAR PAR ON PAR.CODPARC = NFE.CODEMP
          WHERE ITE.IDREV IS NOT NULL
              AND ITE.ORDEMCARGA IN (
                  SELECT ORDEMCARGA FROM AD_CABCARREGAMENTO
                  WHERE FROTA LIKE '%' || :1 || '%'
                      AND TRUNC(DATA) = TRUNC(SYSDATE)
                      AND STATUS = 'F2'
              )

          UNION ALL

          SELECT DISTINCT
              VOL.ORDEMCARGA,
              NULL AS IDREV,
              NFE.NUMNOTA,
              VOL.ETQVOL,
              NFE.SERIENOTA,
              NVL(NFE.CHAVENFE, '') AS CHAVENFE,
              PAR.CGC_CPF AS CNPJ
          FROM AD_ITECARREGAMENTOVOL VOL
            LEFT JOIN AD_PEDCARREGAMENTO PED ON PED.NUNOTA = VOL.NUNOTA
            LEFT JOIN TGFVAR VAR ON PED.NUNOTA = VAR.NUNOTAORIG
            LEFT JOIN TGFCAB NFE ON NFE.NUNOTA = VAR.NUNOTA
            LEFT JOIN TGFPAR PAR ON PAR.CODPARC = NFE.CODEMP
          WHERE VOL.ETQVOL IS NOT NULL
              AND VOL.ORDEMCARGA IN (
                  SELECT ORDEMCARGA FROM AD_CABCARREGAMENTO
                  WHERE FROTA LIKE '%' || :2 || '%'
                      AND TRUNC(DATA) = TRUNC(SYSDATE)
                      AND STATUS = 'F2'
              )
      )
      ORDER BY ORDEMCARGA, NUMNOTA NULLS LAST
    `;
    // O valor de "frota" é repetido (uma vez por ramo do UNION ALL) — por
    // isso o array de parâmetros tem o mesmo valor duas vezes, casando com
    // os binds posicionais :1 e :2.
    const linhas: any[] = await this.dataSource!.query(sql, [frota, frota]);
    return linhas.map((l) => this.normalizar(l));
  }

  private normalizar(l: Record<string, any>): LinhaOrigem {
    const toNum = (v: any): number | null => (v !== '' && v != null ? Number(v) : null);
    const toStr = (v: any): string | null => (v !== '' && v != null ? String(v) : null);

    return {
      ordemCarga: Number(l.ORDEMCARGA),
      idRev: toNum(l.IDREV),
      numnota: toNum(l.NUMNOTA),
      serieNota: toNum(l.SERIENOTA),
      etqVol: toStr(l.ETQVOL),
      chaveNfe: toStr(l.CHAVENFE),
      cnpj: toStr(l.CNPJ),
    };
  }
}
