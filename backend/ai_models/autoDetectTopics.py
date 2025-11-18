# ai_models/autoDetectTopics.py
import sys, json, re
from typing import List, Dict, Any
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
import numpy as np

def normalize_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def extract_phrases(text: str, min_len: int = 2, max_len: int = 5) -> List[str]:
    toks = re.findall(r"\b\w+\b", text.lower())
    phrases = set()
    for n in range(min_len, max_len + 1):
        for i in range(len(toks) - n + 1):
            phrases.add(" ".join(toks[i:i+n]))
    return [p for p in phrases if len(p) >= 5]

def detect_with_similarity(transcripts: List[str], n_top: int = 5, language: str = "english") -> Dict[str, Any]:
    texts = [normalize_text(t) for t in transcripts if isinstance(t, str)]
    if not texts:
        return {"topics": [], "assignments": [], "probs": [], "similar_samples": [], "candidate_phrases": [], "promote_candidates": []}

    # Embedding model
    model = SentenceTransformer("all-MiniLM-L6-v2")
    embs = model.encode(texts, normalize_embeddings=True)

    idx_new = len(texts) - 1
    sims = []
    for i in range(len(texts) - 1):
        sim = float(np.dot(embs[i], embs[idx_new]))  # cosine since normalized
        sims.append({"index": int(i), "score": sim})

    sims_sorted = sorted(sims, key=lambda x: x["score"], reverse=True)[:n_top]

    # BERTopic clustering only if we have >=2 texts
    topics_info = []
    assignments = []
    probs = []
    if len(texts) >= 2:
        topic_model = BERTopic(language=language)
        assignments, probs = topic_model.fit_transform(texts)
        # Convert to JSON-safe types
        assignments = [int(a) for a in assignments]
        probs = [float(p) if p is not None else None for p in probs]
        df_info = topic_model.get_topic_info()
        topics_info = df_info.to_dict("records")

    # Extract candidate phrases from new transcript
    new_text = texts[idx_new]
    cand_phrases = extract_phrases(new_text)

    # Heuristic promotion candidates
    promote = []
    score_threshold = 0.45
    top_indices = [s["index"] for s in sims_sorted if s["score"] >= score_threshold]
    sample_texts = [texts[i] for i in top_indices]
    sample_join = " \n ".join(sample_texts) if sample_texts else ""

    for p in cand_phrases:
        if p in sample_join:
            promote.append({"phrase": p, "reason": "present_in_similar_samples", "weight": 1.0})

    return {
        "topics": topics_info,
        "assignments": assignments,
        "probs": probs,
        "similar_samples": sims_sorted,
        "candidate_phrases": cand_phrases,
        "promote_candidates": promote
    }

if __name__ == "__main__":
    raw = sys.argv[1] if len(sys.argv) > 1 else "[]"
    texts = json.loads(raw)
    out = detect_with_similarity(texts, n_top=5, language="english")
    print(json.dumps(out))
