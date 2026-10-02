/**
 * Agrupa as linhas "cruas" vindas do Oracle (ou do mock) em uma estrutura
 * organizada assim:
 *
 *   ordemCarga (+ cnpj)
 *     └─ chaveNfe (+ numnota, serieNota, totalEtiquetas)
 *          └─ etiquetas: array ÚNICO, misturando itens pré-fatura (idRev)
 *             e etiquetas de volume pós-fatura (etqVol)
 *
 * Uma CHAVENFE corresponde a uma única nota fiscal (numnota/serieNota) —
 * tanto os itens (idRev) quanto as etiquetas (etqVol) resolvem para a mesma
 * NFE via o join PED -> TGFVAR -> TGFCAB, então não há ambiguidade aqui.
 *
 * A numeração de `sequencia` é CONTÍNUA dentro de cada chaveNfe: primeiro os
 * itens por idRev (1..N), depois as etiquetas por etqVol continuam a partir
 * de N+1 — tudo no mesmo array `etiquetas`.
 *
 * Linhas sem chave de NF-e (ainda não faturadas, ou sem vínculo no TGFVAR)
 * ficam agrupadas em `chaveNfe: null`.
 */

export interface LinhaOrigem {
  ordemCarga: number;
  idRev: number | null;
  numnota: number | null;
  serieNota: number | null;
  etqVol: string | null;
  chaveNfe: string | null;
  cnpj: string | null;
}

export interface ItemPedido {
  barCode: number;
  sequencia: number;
}

export interface ItemNota {
  barCode: string;
  sequencia: number;
}

export type ItemEtiqueta = ItemPedido | ItemNota;

export interface ChaveNfeAgrupada {
  chaveNfe: string | null;
  cnpj: string | null;
  numnota: number | null;
  serieNota: number | null;
  totalEtiquetas: number;
  etiquetas: ItemEtiqueta[];
}

export interface OrdemCargaAgrupada {
  ordemCarga: number;
  chavesNfe: ChaveNfeAgrupada[];
}

interface GrupoChave {
  numnota: number | null;
  cnpj: string | null;
  serieNota: number | null;
  idRevs: number[];
  etqVols: string[];
}

export function agruparPorOrdemCarga(linhas: LinhaOrigem[]): OrdemCargaAgrupada[] {
  const porOrdem = new Map<number, LinhaOrigem[]>();

  for (const linha of linhas) {
    const lista = porOrdem.get(linha.ordemCarga) ?? [];
    lista.push(linha);
    porOrdem.set(linha.ordemCarga, lista);
  }

  const resultado: OrdemCargaAgrupada[] = [];

  for (const [ordemCarga, linhasDaOrdem] of porOrdem.entries()) {
    const porChave = new Map<string | null, GrupoChave>();
    let cnpj: string | null = null;

    for (const linha of linhasDaOrdem) {
      if (cnpj == null && linha.cnpj != null) {
        cnpj = linha.cnpj;
      }

      let grupo = porChave.get(linha.chaveNfe);
      if (!grupo) {
        grupo = { cnpj: null, numnota: null, serieNota: null, idRevs: [], etqVols: [] };
        porChave.set(linha.chaveNfe, grupo);
      }

      if (grupo.numnota == null && linha.numnota != null) {
        grupo.numnota = linha.numnota;
      }
      if (grupo.serieNota == null && linha.serieNota != null) {
        grupo.serieNota = linha.serieNota;
      }
      if (linha.idRev != null) {
        grupo.idRevs.push(linha.idRev);
      }
      if (linha.etqVol != null) {
        grupo.etqVols.push(linha.etqVol);
      }
    }

    resultado.push({
      ordemCarga,
      chavesNfe: [...porChave.entries()].map(([chaveNfe, grupo]) => {
        // Sequência contínua, tudo num array só: idRev primeiro (1..N),
        // etqVol continua depois (N+1..).
        let seq = 0;
        const etiquetas: ItemEtiqueta[] = [
          ...grupo.idRevs.map((barCode): ItemPedido => ({ barCode, sequencia: ++seq })),
          ...grupo.etqVols.map((barCode): ItemNota => ({ barCode, sequencia: ++seq })),
        ];

        return {
          chaveNfe,
          cnpj: grupo.cnpj ?? cnpj,
          numnota: grupo.numnota,
          serieNota: grupo.serieNota,
          totalEtiquetas: etiquetas.length,
          etiquetas,
        };
      }),
    });
  }

  return resultado;
}
