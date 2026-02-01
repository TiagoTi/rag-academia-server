import { Database } from 'bun:sqlite';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { gerarEmbedding } from './insert-embeddings';
import type { Documento, DocumentoComEmbedding, DocumentoBD } from './types';

/**
 * Classe para gerenciar o banco de dados de embeddings
 * 
 * Por que uma classe?
 * - Encapsula toda a lógica de banco de dados (Single Responsibility)
 * - Facilita testes e manutenção
 * - Permite reutilizar em outros lugares do projeto
 */
class BancoVetorial {
  private db: Database;

  constructor(caminhoDb: string = process.env.DB_PATH || './embeddings.sqlite') {
    // Cria ou abre o banco de dados
    this.db = new Database(caminhoDb);
    
    // Inicializa as tabelas
    this.inicializarTabelas();
  }

  /**
   * Cria a tabela de documentos se ela não existir
   * 
   * Por que IF NOT EXISTS?
   * - Permite executar múltiplas vezes sem erro
   * - Facilita deploy e atualizações
   */
  private inicializarTabelas(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        caminho TEXT NOT NULL UNIQUE,
        conteudo TEXT NOT NULL,
        embedding TEXT NOT NULL,
        data_indexacao TEXT NOT NULL
      )
    `);

    console.log('Tabela de documentos inicializada');
  }

  /**
   * Insere ou atualiza um documento no banco
   * 
   * Por que INSERT OR REPLACE?
   * - Se o documento já existe (mesmo caminho), atualiza
   * - Se não existe, insere novo
   * - Evita duplicatas
   */
  inserirDocumento(documento: DocumentoComEmbedding): void {
    // Convertemos o array de números para JSON string
    const embeddingJson = JSON.stringify(documento.embedding);
    
    // Data atual no formato ISO
    const dataIndexacao = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO documentos (nome, caminho, conteudo, embedding, data_indexacao)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      documento.nome,
      documento.caminho,
      documento.conteudo,
      embeddingJson,
      dataIndexacao
    );

    console.log(`Documento inserido: ${documento.nome}`);
  }

  /**
   * Insere múltiplos documentos em uma transação
   * 
   * Por que transação?
   * - Muito mais rápido (até 100x)
   * - Garante atomicidade: ou todos são inseridos ou nenhum
   * - Se der erro no meio, faz rollback automático
   */
  inserirDocumentosEmLote(documentos: DocumentoComEmbedding[]): void {
    const transaction = this.db.transaction((docs: DocumentoComEmbedding[]) => {
      for (const doc of docs) {
        this.inserirDocumento(doc);
      }
    });

    transaction(documentos);
    console.log(`${documentos.length} documentos inseridos em lote`);
  }

  /**
   * Busca todos os documentos do banco
   * 
   * Por que retornar DocumentoComEmbedding[]?
   * - Mantém a interface consistente com o resto do código
   * - Facilita reutilizar em outras partes do sistema
   */
  buscarTodosDocumentos(): DocumentoComEmbedding[] {
    const stmt = this.db.prepare('SELECT * FROM documentos');
    const rows = stmt.all() as DocumentoBD[];

    // Convertemos os dados do banco para a interface que usamos no código
    return rows.map(row => ({
      nome: row.nome,
      caminho: row.caminho,
      conteudo: row.conteudo,
      tamanho: row.conteudo.length,
      embedding: JSON.parse(row.embedding)  // Converte JSON string de volta para array
    }));
  }

  /**
   * Conta quantos documentos estão indexados
   */
  contarDocumentos(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as total FROM documentos');
    const result = stmt.get() as { total: number };
    return result.total;
  }

  /**
   * Limpa todos os documentos do banco
   * 
   * Útil para reindexar tudo do zero
   */
  limparDocumentos(): void {
    this.db.run('DELETE FROM documentos');
    console.log('Todos os documentos foram removidos');
  }

  /**
   * Fecha a conexão com o banco
   * 
   * Por que fechar?
   * - Libera recursos
   * - Garante que todos os dados foram salvos
   * - Boa prática de gerenciamento de recursos
   */
  fechar(): void {
    this.db.close();
    console.log('Conexao com banco fechada');
  }
}

// Exporta para ser usado em outros arquivos
export { BancoVetorial, type DocumentoComEmbedding };