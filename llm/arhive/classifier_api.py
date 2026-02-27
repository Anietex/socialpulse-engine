"""
Fast inference API for tweet classification
Runs on CPU, super fast!
"""
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import torch
from transformers import DistilBertTokenizer, DistilBertForSequenceClassification
import json

app = FastAPI()

# Load model and tokenizer at startup
print("Loading model...")
tokenizer = DistilBertTokenizer.from_pretrained('./tweet_classifier_final')
model = DistilBertForSequenceClassification.from_pretrained('./tweet_classifier_final')
model.eval()  # Set to evaluation mode

# Load labels
with open('./tweet_classifier_final/labels.json', 'r') as f:
    labels_data = json.load(f)
    id2label = {int(k): v for k, v in labels_data['id2label'].items()}

print("Model loaded and ready!")

class Tweet(BaseModel):
    id: str
    text: str

class ClassificationRequest(BaseModel):
    tweets: List[Tweet]

class ClassificationResult(BaseModel):
    id: str
    text: str
    category: str
    confidence: float

@app.post("/classify", response_model=List[ClassificationResult])
async def classify_tweets(request: ClassificationRequest):
    """
    Classify a batch of tweets
    """
    tweets = request.tweets

    if not tweets:
        return []

    # Tokenize all tweets at once (batch processing)
    texts = [tweet.text for tweet in tweets]

    encoded = tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=128,
        return_tensors='pt'
    )

    # Run inference (no gradients needed)
    with torch.no_grad():
        outputs = model(**encoded)
        predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        predicted_classes = predictions.argmax(dim=-1)
        confidences = predictions.max(dim=-1).values

    # Prepare results
    results = []
    for i, tweet in enumerate(tweets):
        category = id2label[predicted_classes[i].item()]
        confidence = confidences[i].item()

        results.append(ClassificationResult(
            id=tweet.id,
            text=tweet.text,
            category=category,
            confidence=confidence
        ))

    return results

@app.get("/health")
async def health():
    return {"status": "ok", "model": "distilbert-tweet-classifier"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
