import os
from pinecone import Pinecone, ServerlessSpec

# Load Pinecone API key and environment from environment variables
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
PINECONE_ENV = os.getenv('PINECONE_ENV', 'us-east-1')  # default region

if not PINECONE_API_KEY:
    raise ValueError('Please set the PINECONE_API_KEY environment variable')

# Initialize Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

# Name of the index you want to connect to
INDEX_NAME = 'quickstart'

# Ensure the index exists (create if missing)
if INDEX_NAME not in pc.list_indexes().names:
    pc.create_index(
        name=INDEX_NAME,
        dimension=384,  # match the embedding dimension used in the backend
        metric='cosine',
        spec=ServerlessSpec(cloud='aws', region=PINECONE_ENV)
    )

# Get a reference to the index
index = pc.Index(INDEX_NAME)

def upsert_vectors(vectors):
    """Upsert a list of vectors.
    Each vector should be a dict with keys: 'id', 'values', and optional 'metadata'.
    Example:
        vectors = [{
            'id': 'tool-123',
            'values': [0.1, 0.2, ...],
            'metadata': {'name': 'My Tool', 'category': 'AI Video'}
        }]
    """
    index.upsert(vectors)

def query_vector(query_vector, top_k=10, filter=None):
    """Search the index.
    Args:
        query_vector (list[float]): Embedding vector.
        top_k (int): Number of results.
        filter (dict, optional): Metadata filter, e.g. {'category': 'AI Video'}.
    Returns:
        dict: Pinecone response containing matches.
    """
    return index.query(vector=query_vector, top_k=top_k, include_metadata=True, filter=filter)

# Example usage (uncomment for quick test)
# if __name__ == '__main__':
#     # Dummy vector for demonstration (replace with real embedding)
#     dummy_vec = [0.0] * 384
#     print(query_vector(dummy_vec))
