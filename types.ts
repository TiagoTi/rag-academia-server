/**
 * Shared types for the RAG system.
 * Centralizes interfaces to avoid duplication across modules.
 */

// Interface for structuring document data
export interface Documento {
  nome: string;
  caminho: string;
  conteudo: string;
  tamanho: number;
}

// Interface for a document with its embedding
export interface DocumentoComEmbedding extends Documento {
  embedding: number[];
}

// Interface for a document in the database
export interface DocumentoBD {
  id: number;
  nome: string;
  caminho: string;
  conteudo: string;
  embedding: string;  // JSON stringified
  data_indexacao: string;
}

// Interface for Ollama embedding request
export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

// Interface for Ollama embedding response
export interface OllamaEmbeddingResponse {
  embedding: number[];
}

// Interface for search results
export interface ResultadoBusca {
  documento: DocumentoComEmbedding;
  similaridade: number;  // Value between -1 and 1 (higher is more similar)
}