import { BancoVetorial, type DocumentoComEmbedding } from './database';
import { gerarEmbedding } from './insert-embeddings';
import { calcularSimilaridadeCosseno } from './utils';
import type { ResultadoBusca } from './types';

/**
 * Busca os documentos mais similares a uma pergunta
 * 
 * Este é o coração do sistema RAG!
 * 
 * Processo:
 * 1. Converte a pergunta em embedding
 * 2. Busca todos os documentos do banco
 * 3. Calcula similaridade entre pergunta e cada documento
 * 4. Ordena por similaridade (maior primeiro)
 * 5. Retorna os N mais relevantes
 * 
 * @param pergunta - A pergunta do usuário
 * @param topK - Quantos documentos retornar (padrão: 3)
 * @param limiarSimilaridade - Similaridade mínima para considerar relevante (padrão: 0.5)
 * @returns Array com os documentos mais similares
 */
async function buscarDocumentosSimilares(
  pergunta: string,
  topK: number = 3,
  limiarSimilaridade: number = 0.5
): Promise<ResultadoBusca[]> {
  console.log(`\nBuscando documentos similares a: "${pergunta}"`);
  console.log(`Parametros: topK=${topK}, limiar=${limiarSimilaridade}\n`);

  try {
    // Passo 1: Gerar embedding da pergunta
    console.log('Gerando embedding da pergunta...');
    const embeddingPergunta = await gerarEmbedding(pergunta);
    console.log(`  - Embedding gerado: ${embeddingPergunta.length} dimensoes`);

    // Passo 2: Buscar todos os documentos do banco
    console.log('\nBuscando documentos no banco...');
    const banco = new BancoVetorial();
    const todosDocumentos = banco.buscarTodosDocumentos();
    console.log(`  - Encontrados ${todosDocumentos.length} documentos`);

    // Passo 3: Calcular similaridade para cada documento
    console.log('\nCalculando similaridades...');
    const resultados: ResultadoBusca[] = [];

    for (const documento of todosDocumentos) {
      const similaridade = calcularSimilaridadeCosseno(
        embeddingPergunta,
        documento.embedding
      );

      console.log(`  - ${documento.nome}: ${similaridade.toFixed(4)}`);

      // Só adiciona se passar no limiar de similaridade
      if (similaridade >= limiarSimilaridade) {
        resultados.push({
          documento,
          similaridade
        });
      }
    }

    // Passo 4: Ordenar por similaridade (maior primeiro)
    // Sort é in-place, modifica o array original
    resultados.sort((a, b) => b.similaridade - a.similaridade);

    // Passo 5: Retornar apenas os topK resultados
    const resultadosFinais = resultados.slice(0, topK);

    console.log(`\nDocumentos relevantes encontrados: ${resultadosFinais.length}`);

    // Fecha a conexão com o banco
    banco.fechar();

    return resultadosFinais;

  } catch (erro) {
    console.error('Erro na busca:', erro);
    throw new Error('Falha ao buscar documentos similares');
  }
}

/**
 * Monta um contexto concatenando os documentos mais relevantes
 * 
 * Por que montar um contexto?
 * - A LLM precisa receber os documentos relevantes junto com a pergunta
 * - Isso permite que ela responda baseada em informações reais
 * - Reduz alucinações e aumenta a precisão
 * 
 * @param resultados - Array com os resultados da busca
 * @returns String com o contexto formatado
 */
function montarContexto(resultados: ResultadoBusca[]): string {
  if (resultados.length === 0) {
    return 'Nenhum documento relevante encontrado.';
  }

  // Construímos o contexto formatado
  let contexto = 'Documentos relevantes:\n\n';

  resultados.forEach((resultado, index) => {
    contexto += `--- Documento ${index + 1}: ${resultado.documento.nome} (similaridade: ${resultado.similaridade.toFixed(2)}) ---\n`;
    contexto += `${resultado.documento.conteudo}\n\n`;
  });

  return contexto;
}

// Exporta para ser usado em outros arquivos
export { 
  buscarDocumentosSimilares, 
  montarContexto,
  calcularSimilaridadeCosseno,
  type ResultadoBusca 
};
