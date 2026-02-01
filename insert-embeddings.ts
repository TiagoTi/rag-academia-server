import { readdir, readFile, rename } from 'fs/promises';
import { join, dirname } from 'path';
import { BancoVetorial } from './database';
import type { Documento, DocumentoComEmbedding, OllamaEmbeddingRequest, OllamaEmbeddingResponse } from './types';

// Importamos a URL do Ollama do arquivo de configuração
// Seguindo o princípio DRY (Don't Repeat Yourself)
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';


/**
 * Função que gera o embedding de um texto usando o Ollama
 * 
 * Por que uma função separada?
 * - Facilita testes unitários
 * - Permite reutilizar em outros lugares
 * - Segue o princípio de Responsabilidade Única (SOLID)
 * 
 * @param texto - O texto que será convertido em embedding
 * @returns Promise com o vetor de números (embedding)
 */
async function gerarEmbedding(texto: string, model: string = 'nomic-embed-text:latest'): Promise<number[]> {
  try {
    // Preparamos o corpo da requisição
    // O modelo nomic-embed-text é específico para gerar embeddings
    const requestBody: OllamaEmbeddingRequest = {
      model: model,
      prompt: texto
    };

    // Fazemos a requisição para o endpoint de embeddings
    // Note que é /api/embeddings, diferente do /api/chat usado antes
    console.log('Enviando requisição de embedding para o Ollama... OLLAMA_BASE_URL:', OLLAMA_BASE_URL);
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    // Verificamos se deu certo
    if (!response.ok) {
      throw new Error(`Ollama retornou status ${response.status}`);
    }

    // Extraímos o embedding da resposta
    const data = await response.json() as OllamaEmbeddingResponse;

    return data.embedding;

  } catch (erro) {
    console.error('Erro ao gerar embedding:', erro);
    throw new Error('Falha na geração do embedding');
  }
}



/**
 * Classe responsável por inserir novos embeddings no banco de dados
 * 
 * Responsabilidades:
 * - Ler arquivos da pasta "novos"
 * - Gerar embeddings para os arquivos
 * - Inserir no banco de dados
 * - Mover arquivos processados para "processados" ou "erro"
 */
export class InsertEmbeddings {
  private pastaNovos: string;
  private pastaProcessados: string;
  private pastaErro: string;
  private banco: BancoVetorial;

  constructor(
    pastaBase: string = join(__dirname, 'arquivos'),
    caminhoDb: string = process.env.DB_PATH || join(__dirname, 'embeddings.sqlite')
  ) {
    this.pastaNovos = join(pastaBase, 'novos');
    this.pastaProcessados = join(pastaBase, 'processados');
    this.pastaErro = join(pastaBase, 'erro');
    this.banco = new BancoVetorial(caminhoDb);
  }

  /**
   * Lê todos os arquivos Markdown da pasta "novos"
   */
  private async lerArquivosNovos(): Promise<Documento[]> {
    try {
      console.log(`Lendo arquivos da pasta: ${this.pastaNovos}`);

      const arquivos = await readdir(this.pastaNovos);
      const arquivosMarkdown = arquivos.filter(arquivo =>
        arquivo.endsWith('.md')
      );

      console.log(`Encontrados ${arquivosMarkdown.length} arquivos Markdown`);

      const documentos: Documento[] = [];

      for (const nomeArquivo of arquivosMarkdown) {
        const caminhoCompleto = join(this.pastaNovos, nomeArquivo);
        console.log(`Processando: ${nomeArquivo}`);

        const conteudo = await readFile(caminhoCompleto, 'utf-8');

        const documento: Documento = {
          nome: nomeArquivo,
          caminho: caminhoCompleto,
          conteudo: conteudo,
          tamanho: conteudo.length
        };

        documentos.push(documento);
        console.log(`  - Tamanho: ${documento.tamanho} caracteres`);
      }

      return documentos;

    } catch (erro) {
      console.error('Erro ao ler arquivos novos:', erro);
      throw new Error('Falha na leitura dos arquivos novos');
    }
  }

  /**
   * Divide o conteúdo de um documento em chunks menores
   * @param conteudo - Texto completo do documento
   * @param tamanhoChunk - Número máximo de caracteres por chunk (padrão: 1000)
   * @returns Array de strings (chunks)
   */
  private dividirEmChunks(conteudo: string, tamanhoChunk: number = 2000): string[] {
    const chunks: string[] = [];
    let inicio = 0;
    
    while (inicio < conteudo.length) {
      let fim = inicio + tamanhoChunk;
      
      // Tenta cortar em uma quebra de linha para não dividir sentenças
      if (fim < conteudo.length) {
        const quebraLinha = conteudo.lastIndexOf('\n', fim);
        if (quebraLinha > inicio) {
          fim = quebraLinha;
        }
      }
      
      chunks.push(conteudo.slice(inicio, fim).trim());
      inicio = fim;
    }
    
    return chunks;
  }

  /**
   * Processa um documento individual, gerando embeddings para seus chunks
   */
  private async processarDocumento(documento: Documento): Promise<DocumentoComEmbedding[]> {
    console.log(`Processando chunks para: ${documento.nome}`);
    
    const chunks = this.dividirEmChunks(documento.conteudo);
    const documentosComEmbeddings: DocumentoComEmbedding[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`  - Chunk ${i + 1}/${chunks.length}: ${chunk.length} caracteres`);
      
      try {
        const embedding = await gerarEmbedding(chunk);
        
        const documentoChunk: DocumentoComEmbedding = {
          nome: `${documento.nome}_chunk_${i + 1}`,
          caminho: documento.caminho,
          conteudo: chunk,
          tamanho: chunk.length,
          embedding: embedding
        };
        
        documentosComEmbeddings.push(documentoChunk);
      } catch (erro) {
        console.error(`Erro no chunk ${i + 1}:`, erro);
      }
    }
    
    return documentosComEmbeddings;
  }

  /**
   * Move um arquivo para a pasta de processados
   */
  private async moverParaProcessados(caminhoArquivo: string): Promise<void> {
    const nomeArquivo = caminhoArquivo.split('/').pop()!;
    const novoCaminho = join(this.pastaProcessados, nomeArquivo);

    try {
      await rename(caminhoArquivo, novoCaminho);
      console.log(`Arquivo movido para processados: ${nomeArquivo}`);
    } catch (erro) {
      console.error(`Erro ao mover arquivo para processados: ${nomeArquivo}`, erro);
    }
  }

  /**
   * Move um arquivo para a pasta de erro
   */
  private async moverParaErro(caminhoArquivo: string): Promise<void> {
    const nomeArquivo = caminhoArquivo.split('/').pop()!;
    const novoCaminho = join(this.pastaErro, nomeArquivo);

    try {
      await rename(caminhoArquivo, novoCaminho);
      console.log(`Arquivo movido para erro: ${nomeArquivo}`);
    } catch (erro) {
      console.error(`Erro ao mover arquivo para erro: ${nomeArquivo}`, erro);
    }
  }

  /**
   * Processa todos os novos documentos e insere no banco
   */
  async processarNovosEmbeddings(): Promise<void> {
    console.log('=== INICIANDO PROCESSAMENTO DE NOVOS EMBEDDINGS ===\n');

    try {
      // 1. Ler arquivos novos
      const documentos = await this.lerArquivosNovos();

      if (documentos.length === 0) {
        console.log('Nenhum arquivo novo encontrado.');
        return;
      }

      console.log('\nGerando embeddings...\n');

      const documentosComEmbeddings: DocumentoComEmbedding[] = [];
      const arquivosComErro: string[] = [];

      // 2. Processar cada documento
      for (const documento of documentos) {
        try {
          const documentosComEmbedding = await this.processarDocumento(documento);
          documentosComEmbeddings.push(...documentosComEmbedding);

          // Mover para processados
          await this.moverParaProcessados(documento.caminho);

        } catch (erro) {
          console.error(`Falha ao processar ${documento.nome}, movendo para erro`);
          arquivosComErro.push(documento.caminho);
          await this.moverParaErro(documento.caminho);
        }
      }

      // 3. Inserir no banco se houver documentos válidos
      if (documentosComEmbeddings.length > 0) {
        console.log('\nInserindo no banco de dados...');
        this.banco.inserirDocumentosEmLote(documentosComEmbeddings);
        console.log(`${documentosComEmbeddings.length} documentos inseridos com sucesso`);
      }

      // 4. Resumo
      console.log('\n=== RESUMO DO PROCESSAMENTO ===');
      console.log(`Total de arquivos encontrados: ${documentos.length}`);
      console.log(`Processados com sucesso: ${documentosComEmbeddings.length}`);
      console.log(`Com erro: ${arquivosComErro.length}`);

      if (arquivosComErro.length > 0) {
        console.log('\nArquivos com erro:');
        arquivosComErro.forEach(caminho => {
          console.log(`  - ${caminho.split('/').pop()}`);
        });
      }

    } catch (erro) {
      console.error('Erro no processamento de novos embeddings:', erro);
      throw erro;
    } finally {
      // Fechar conexão com o banco
      this.banco.fechar();
    }
  }

  /**
   * Fecha a conexão com o banco de dados
   */
  fechar(): void {
    this.banco.fechar();
  }
}

/**
 * Função principal para executar o processamento de novos embeddings
 */
async function main() {
  const insertEmbeddings = new InsertEmbeddings();

  try {
    await insertEmbeddings.processarNovosEmbeddings();
    console.log('\nProcessamento concluído com sucesso!');
  } catch (erro) {
    console.error('Erro no processamento:', erro);
    process.exit(1);
  }
}

// Executa apenas se for chamado diretamente
if (import.meta.main) {
  main().catch(console.error);
}

export { gerarEmbedding };
export default InsertEmbeddings;