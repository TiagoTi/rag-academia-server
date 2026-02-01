import { montarContexto, buscarDocumentosSimilares } from "./busca";

// Exemplo de uso
const pergunta = 'Bun applications with Docker?';
const resultados = await buscarDocumentosSimilares(pergunta, 2, 0.3);
const contexto = montarContexto(resultados);
console.log('Contexto montado:', contexto);