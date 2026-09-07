from typing import Any, Dict, List, Optional

from sentence_transformers import SentenceTransformer


class RAGService:
    def __init__(self):
        print("=" * 60)
        print("Loading KisanX RAG embedding model...")
        print("Model: sentence-transformers/all-MiniLM-L6-v2")

        self.embedding_model = SentenceTransformer(
            "sentence-transformers/all-MiniLM-L6-v2"
        )

        print("RAG embedding model loaded successfully.")
        print("=" * 60)

    def create_embedding(self, text: str) -> List[float]:
        embedding = self.embedding_model.encode(
            text,
            normalize_embeddings=True,
        )

        return embedding.tolist()

    def retrieve(
        self,
        query: str,
        match_count: int = 5,
        crop: Optional[str] = None,
        disease: Optional[str] = None,
    ) -> List[Dict[str, Any]]:

        from app.services.supabase_service import get_server_supabase

        embedding = self.create_embedding(query)

        supabase = get_server_supabase()

        response = (
            supabase.rpc(
                "match_knowledge_documents",
                {
                    "query_embedding": embedding,
                    "match_count": match_count,
                    "filter_crop": crop,
                    "filter_disease": disease,
                },
            )
            .execute()
        )

        return response.data or []


rag_service = RAGService()