"""
Fine-tune DistilBERT for tweet classification
Super fast, accurate, and runs on CPU!
"""
import json
import torch
from transformers import (
    DistilBertTokenizer,
    DistilBertForSequenceClassification,
    TrainingArguments,
    Trainer
)
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset
import numpy as np

# Categories
CATEGORIES = [
    'Technology', 'Programming', 'Artificial Intelligence', 'Machine Learning',
    'Web Development', 'Mobile Development', 'Data Science', 'Cybersecurity',
    'Blockchain', 'Cryptocurrency', 'Business', 'Entrepreneurship', 'Marketing',
    'Finance', 'Investing', 'Startups', 'Productivity', 'Career Development',
    'Leadership', 'Management', 'Sports', 'Football', 'Basketball', 'Gaming',
    'Entertainment', 'Movies', 'Music', 'Books', 'Art', 'Photography', 'Travel',
    'Food', 'Fitness', 'Health', 'Wellness', 'Mental Health', 'Science', 'Space',
    'Climate Change', 'Politics', 'News', 'Education', 'History', 'Philosophy',
    'Psychology', 'Fashion', 'Design', 'Real Estate', 'Pets', 'Humor', 'none'
]

# Create label mapping
label2id = {label: idx for idx, label in enumerate(CATEGORIES)}
id2label = {idx: label for idx, label in enumerate(CATEGORIES)}

class TweetDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]

        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)
    accuracy = (predictions == labels).mean()
    return {'accuracy': accuracy}

def train_classifier():
    print("Loading training data...")
    with open('./training_data.json', 'r') as f:
        data = json.load(f)

    # Prepare data
    texts = [item['text'] for item in data]
    labels = [label2id[item['label']] for item in data]

    print(f"Loaded {len(texts)} training examples")
    print(f"Number of categories: {len(CATEGORIES)}")

    # Split data (no stratify due to rare classes)
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42
    )

    print(f"Train: {len(train_texts)}, Val: {len(val_texts)}")

    # Load tokenizer and model
    print("\nLoading DistilBERT...")
    tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
    model = DistilBertForSequenceClassification.from_pretrained(
        'distilbert-base-uncased',
        num_labels=len(CATEGORIES),
        id2label=id2label,
        label2id=label2id
    )

    # Create datasets
    train_dataset = TweetDataset(train_texts, train_labels, tokenizer)
    val_dataset = TweetDataset(val_texts, val_labels, tokenizer)

    # Training arguments
    training_args = TrainingArguments(
        output_dir='./tweet_classifier',
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        warmup_steps=100,
        weight_decay=0.01,
        logging_dir='./logs',
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
    )

    # Create Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
    )

    # Train
    print("\nStarting training...")
    trainer.train()

    # Evaluate
    print("\nEvaluating...")
    results = trainer.evaluate()
    print(f"Validation Accuracy: {results['eval_accuracy']:.4f}")

    # Save model
    print("\nSaving model...")
    model.save_pretrained('./tweet_classifier_final')
    tokenizer.save_pretrained('./tweet_classifier_final')

    # Save label mappings
    with open('./tweet_classifier_final/labels.json', 'w') as f:
        json.dump({'label2id': label2id, 'id2label': id2label}, f)

    print("\n✅ Training complete! Model saved to ./tweet_classifier_final")

if __name__ == "__main__":
    train_classifier()
