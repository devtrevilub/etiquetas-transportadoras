// Mock simples do Sistema de Destino, só para teste local end-to-end.
// Independente do NestJS (plain Node/Express) — só para simular a outra ponta.
const express = require('express');
const app = express();
app.use(express.json());

app.post('/etiquetas', (req, res) => {
  console.log('[MOCK DESTINO] recebeu etiqueta unitária:', JSON.stringify(req.body));
  res.status(200).json({ recebido: true, protocolo: 'MOCK-' + Date.now() });
});

app.post('/etiquetas/lote', (req, res) => {
  console.log('[MOCK DESTINO] recebeu lote com', req.body.etiquetas.length, 'etiqueta(s)');
  res.status(200).json({ recebido: true, protocolo: 'MOCK-LOTE-' + Date.now() });
});

app.listen(4000, () => console.log('[MOCK DESTINO] rodando na porta 4000'));
