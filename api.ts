import { montarContexto, buscarDocumentosSimilares } from "./busca";

async function main() {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

    const server = Bun.serve({
        port: port,
        async fetch(req) {
            if (
                req.url.endsWith("/api/embeddings") &&
                req.method === "POST" && 
                req.headers.get("Content-Type")?.includes("application/json")
            ) {
                try {
                    // Here you would handle the embeddings API logic
                    const body = await req.json() as { prompt?: string; topK?: number; limiarSimilaridade?: number };
                    let { prompt, topK ,limiarSimilaridade} = body;
                    if (!prompt) {
                        return new Response("Faltando o campo 'prompt' no corpo da requisição", { status: 400 });
                    }
                    if (!topK) {
                        topK = 3;
                    }

                    if (!limiarSimilaridade) {
                        limiarSimilaridade=0.5;
                    }

                    const resultados = await buscarDocumentosSimilares(prompt, topK, limiarSimilaridade);
                    const contexto = montarContexto(resultados);
                    console.log('Contexto montado:', contexto);
                    return new Response(JSON.stringify({ contexto, resultados }), { headers: { "Content-Type": "application/json" } });
                } catch (error) {
                    console.error('Erro ao processar requisição:', error);
                    return new Response("Erro ao processar JSON: " + (error instanceof Error ? error.message : String(error)), { status: 400 });
                }
            }

            return new Response("Embedding API is running");
        },
    });
    console.log(`Server running on http://:${port}`);
}

main().catch(error => {console.error(error);process.exit(1);});