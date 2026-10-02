import { agruparPorOrdemCarga, LinhaOrigem } from '../src/etiquetas/etiquetas-agrupador';
import * as fs from 'fs';
import * as path from 'path';

const raw = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/etiquetas/mock-data.json'), 'utf-8'),
) as any[];

function toNumOrNull(v: string): number | null {
  return v !== '' && v != null ? Number(v) : null;
}
function toStrOrNull(v: string): string | null {
  return v !== '' && v != null ? v : null;
}

// O mock-data.json (gerado do CSV de exemplo) não tem CHAVENFE, NUMNOTA
// (o real, vindo do join com a NFE), SERIENOTA nem CNPJ — só idRev/etqVol
// (via IDREV/ETQVOL) ficam preenchidos; o resto cai em null, caindo tudo no
// grupo chaveNfe=null. É o esperado aqui.
const linhas: LinhaOrigem[] = raw.map((l) => ({
  ordemCarga: Number(l.ORDEMCARGA),
  idRev: toNumOrNull(l.IDREV),
  numnota: null,
  serieNota: null,
  etqVol: toStrOrNull(l.ETQVOL),
  chaveNfe: null,
  cnpj: null,
}));

const resultado = agruparPorOrdemCarga(linhas);

console.log(JSON.stringify(resultado, null, 2));

// Verificações básicas (dados reais do CSV, tudo no grupo chaveNfe=null)
const ordem = resultado[0];
console.assert(resultado.length === 1, `Esperava 1 ordemCarga, veio ${resultado.length}`);
console.assert(ordem.chavesNfe.length === 1, `Esperava 1 chaveNfe (null), veio ${ordem.chavesNfe.length}`);

const grupo = ordem.chavesNfe[0];
console.assert(grupo.chaveNfe === null, `Esperava chaveNfe=null, veio ${grupo.chaveNfe}`);
console.assert(grupo.etiquetas.length === 100, `Esperava 100 itens no array único, veio ${grupo.etiquetas.length}`);
console.assert(
  grupo.totalEtiquetas === 100,
  `Esperava totalEtiquetas=100, veio ${grupo.totalEtiquetas}`,
);

const comIdRev = grupo.etiquetas.filter((e: any) => 'idRev' in e);
const comEtqVol = grupo.etiquetas.filter((e: any) => 'etqVol' in e);
console.assert(comIdRev.length === 50, `Esperava 50 itens com idRev, veio ${comIdRev.length}`);
console.assert(comEtqVol.length === 50, `Esperava 50 itens com etqVol, veio ${comEtqVol.length}`);

console.log('\n✅ Todas as verificações (dados reais do CSV) passaram.');

// ---------------------------------------------------------------------
// Teste sintético adicional: dados inventados, baseados no esboço mais
// recente que você mandou — um único array `etiquetas` misturando idRev e
// etqVol, com sequência contínua e cnpj propagado.
// ---------------------------------------------------------------------
const linhasSinteticas: LinhaOrigem[] = [
  { ordemCarga: 165379, idRev: 5312513, numnota: 18955132, serieNota: 3, etqVol: null, chaveNfe: 'CHAVE-A', cnpj: '12345678912345' },
  { ordemCarga: 165379, idRev: 5312697, numnota: 18955132, serieNota: 3, etqVol: null, chaveNfe: 'CHAVE-A', cnpj: '12345678912345' },
  { ordemCarga: 165379, idRev: null, numnota: 18955132, serieNota: 3, etqVol: 'VOL10939204', chaveNfe: 'CHAVE-A', cnpj: '12345678912345' },
  { ordemCarga: 165379, idRev: null, numnota: 18955132, serieNota: 3, etqVol: 'VOL10939207', chaveNfe: 'CHAVE-A', cnpj: null },
];

const resultadoSintetico = agruparPorOrdemCarga(linhasSinteticas)[0];
console.log('\n--- Teste sintético (array único "etiquetas") ---');
console.log(JSON.stringify(resultadoSintetico, null, 2));

console.assert(resultadoSintetico.cnpj === '12345678912345', `Esperava cnpj propagado, veio ${resultadoSintetico.cnpj}`);

const chaveA = resultadoSintetico.chavesNfe.find((c) => c.chaveNfe === 'CHAVE-A');
console.assert(chaveA?.numnota === 18955132, `Esperava numnota=18955132, veio ${chaveA?.numnota}`);
console.assert(chaveA?.serieNota === 3, `Esperava serieNota=3, veio ${chaveA?.serieNota}`);
console.assert(chaveA?.totalEtiquetas === 4, `Esperava totalEtiquetas=4, veio ${chaveA?.totalEtiquetas}`);
console.assert(chaveA?.etiquetas.length === 4, `Esperava 4 itens no array único, veio ${chaveA?.etiquetas.length}`);

// Sequência contínua, tudo num array só: idRev primeiro (1, 2), etqVol
// continua depois (3, 4) — igual ao esboço mais recente que você mandou.
const seqs = chaveA?.etiquetas.map((e: any) => e.sequencia);
console.assert(JSON.stringify(seqs) === JSON.stringify([1, 2, 3, 4]), `Esperava sequencia [1,2,3,4], veio ${JSON.stringify(seqs)}`);
console.assert('idRev' in (chaveA?.etiquetas[0] as any), 'Primeiro item deveria ter idRev');
console.assert('etqVol' in (chaveA?.etiquetas[2] as any), 'Terceiro item deveria ter etqVol');

console.log('\n✅ Teste sintético (array único) passou.');
