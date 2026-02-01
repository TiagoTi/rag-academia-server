/**
 * Utility functions for the RAG system
 */

/**
 * Calcula a similaridade de cosseno entre dois vetores
 *
 * Por que usar cosseno?
 * - É a métrica padrão para comparar embeddings
 * - Normaliza automaticamente (não depende do tamanho do vetor)
 * - Valores entre -1 e 1 são fáceis de interpretar
 *
 * Fórmula: cos(θ) = (A · B) / (||A|| × ||B||)
 *
 * @param vetorA - Primeiro vetor (ex: embedding da pergunta)
 * @param vetorB - Segundo vetor (ex: embedding do documento)
 * @returns Similaridade entre -1 e 1
 */
export function calcularSimilaridadeCosseno(vetorA: number[], vetorB: number[]): number {
  // Validação: vetores devem ter o mesmo tamanho
  if (vetorA.length !== vetorB.length) {
    throw new Error('Vetores devem ter o mesmo tamanho');
  }

  // Passo 1: Calcular o produto escalar (A · B)
  // Multiplicamos cada elemento correspondente e somamos
  let produtoEscalar = 0;
  for (let i = 0; i < vetorA.length; i++) {
    produtoEscalar += (vetorA[i] ?? 0) * (vetorB[i] ?? 0);
  }

  // Passo 2: Calcular a magnitude de A (||A||)
  // Raiz quadrada da soma dos quadrados
  let magnitudeA = 0;
  for (let i = 0; i < vetorA.length; i++) {
    magnitudeA += (vetorA[i] ?? 0) * (vetorA[i] ?? 0);
  }
  magnitudeA = Math.sqrt(magnitudeA);

  // Passo 3: Calcular a magnitude de B (||B||)
  let magnitudeB = 0;
  for (let i = 0; i < vetorB.length; i++) {
    magnitudeB += (vetorB[i] ?? 0) * (vetorB[i] ?? 0);
  }
  magnitudeB = Math.sqrt(magnitudeB);

  // Passo 4: Calcular a similaridade
  // Dividimos o produto escalar pelo produto das magnitudes
  // Evitamos divisão por zero
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return produtoEscalar / (magnitudeA * magnitudeB);
}