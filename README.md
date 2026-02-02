# Academic Database RAG System

- [repo rag: git/ti2](https://git.c.net.br/gogs_supper_admin/rag-academia-server) | [github](https://github.com/TiagoTi/rag-academia-server)
- [repo: git/ti2](https://git.ti2.net.br/gogs_supper_admin/mcp-academia-server) | [github](https://github.com/TiagoTi/mcp-academia-server)

A Retrieval-Augmented Generation (RAG) system designed for academic document search and retrieval. This system uses vector embeddings to enable semantic search across academic content, providing relevant context for AI-powered question answering.

## Features

- **Vector Search**: Semantic search using cosine similarity on document embeddings
- **Document Ingestion**: Automatic processing and chunking of Markdown documents
- **REST API**: HTTP API for querying similar documents
- **SQLite Vector Database**: Efficient storage of documents and their embeddings
- **Ollama Integration**: Uses Ollama's embedding models for generating vector representations
- **Docker Support**: Containerized deployment with persistent storage
- **TypeScript**: Fully typed codebase with modern JavaScript runtime (Bun)

## Architecture

The system consists of several key components:

1. **Document Processing** (`insert-embeddings.ts`): Reads Markdown files, chunks content, generates embeddings using Ollama, and stores in SQLite
2. **Vector Database** (`database.ts`): SQLite-based storage for documents and their vector embeddings
3. **Search Engine** (`busca.ts`): Performs semantic search using cosine similarity
4. **API Server** (`api.ts`): RESTful API for querying the system
5. **Utilities** (`utils.ts`): Helper functions for similarity calculations

## Prerequisites

- [Bun](https://bun.sh/) runtime (v1.3.6 or later)
- [Ollama](https://ollama.ai/) with embedding model (`nomic-embed-text:latest`)
- SQLite (automatically handled by Bun)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd base-de-dados-academia
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Start Ollama and pull the embedding model**

   ```bash
   ollama serve
   ollama pull nomic-embed-text:latest
   ```

## Usage

### Running the API Server

Start the REST API server:

```bash
bun run api.ts
```

The server will start on port 3000 (configurable via `PORT` environment variable).

### Adding Documents

1. Place new Markdown (`.md`) files in the `arquivos/novos/` directory
2. Run the document ingestion script:

```bash
bun run insert-embeddings.ts
```

This will:

- Process all `.md` files in `arquivos/novos/`
- Generate embeddings for document chunks
- Store them in the vector database
- Move processed files to `arquivos/processados/`
- Move failed files to `arquivos/erro/`

### Testing the Search

Run the example search script:

```bash
bun run index.ts
```

This demonstrates searching for similar documents to a sample query.

## API Reference

### POST /api/embeddings

Search for documents similar to a given prompt.

**Request Body:**

```json
{
  "prompt": "What is the suffix of a markdown file?",
  "topK": 3,
  "limiarSimilaridade": 0.5
}
```

**Parameters:**

- `prompt` (required): The search query text
- `topK` (optional): Number of top results to return (default: 3)
- `limiarSimilaridade` (optional): Minimum similarity threshold (default: 0.5)

**Response:**

```json
{
  "contexto": "Documentos relevantes:\n\n--- Documento 1: file.md (similaridade: 0.85) ---\nContent...",
  "resultados": [
    {
      "documento": {
        "nome": "file.md",
        "caminho": "/path/to/file.md",
        "conteudo": "Content...",
        "tamanho": 1234,
        "embedding": [0.1, 0.2, ...]
      },
      "similaridade": 0.85
    }
  ]
}
```

**Example using curl:**

```http
curl -X POST http://localhost:3000/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"prompt": "on docker?", "topK": 3, "limiarSimilaridade": 0.5}'
```

## Configuration

The system can be configured using environment variables:

- `PORT`: API server port (default: 3000)
- `DB_PATH`: Path to SQLite database file (default: `./embeddings.sqlite`)
- `OLLAMA_BASE_URL`: Ollama API endpoint (default: `http://localhost:11434`)

## Docker Deployment

### Build the Image

```bash
docker build --pull -t rag-academia-server .
```

### Run the Container

```bash
docker run \
  --restart=always \
  -v $(pwd)/embeddings.sqlite:/tmp/embeddings.sqlite \
  --name rag-academia-server \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -e DB_PATH=/tmp/embeddings.sqlite \
  -e PORT=3000 \
  --network=host \
  -d \
  rag-academia-server
```

**Notes:**

- Mount the database file as a volume to persist data
- Use `host.docker.internal` to access Ollama running on the host
- Adjust `OLLAMA_BASE_URL` if Ollama is running in a separate container

## How It Works

1. **Document Ingestion**:
   - Markdown files are read from `arquivos/novos/`
   - Content is split into chunks (~2000 characters)
   - Each chunk is converted to a vector embedding using Ollama
   - Embeddings are stored in SQLite with metadata

2. **Query Processing**:
   - User query is converted to an embedding
   - Cosine similarity is calculated against all stored embeddings
   - Top-K most similar documents are returned
   - Results are formatted into a context string for LLM consumption

3. **Similarity Calculation**:
   - Uses cosine similarity: `cos(θ) = (A · B) / (||A|| × ||B||)`
   - Values range from -1 to 1, where higher values indicate greater similarity

## Project Structure

```txt
├── api.ts                 # REST API server
├── busca.ts               # Search and similarity functions
├── database.ts            # SQLite vector database operations
├── index.ts               # Example usage script
├── insert-embeddings.ts   # Document ingestion pipeline
├── types.ts               # TypeScript type definitions
├── utils.ts               # Utility functions
├── arquivos/              # Document storage
│   ├── novos/            # New documents to process
│   ├── processados/      # Successfully processed documents
│   └── erro/             # Failed processing documents
├── prompts/              # Prompt templates
├── Dockerfile            # Container configuration
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
