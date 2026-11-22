import torch
import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline
import logging

logger = logging.getLogger(__name__)


@dataclass
class DetectorResult:
    name: str
    label: str
    confidence: float
    raw_scores: Dict[str, float]
    processing_time: float


class BaseAIDetector:
    def __init__(self, model_name: str, cache_dir: Optional[str] = None):
        self.model_name = model_name
        self.cache_dir = cache_dir
        self.model = None
        self.tokenizer = None
        self.pipeline = None
        self._loaded = False

    def load(self):
        if self._loaded:
            return

        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name, cache_dir=self.cache_dir
            )
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name, cache_dir=self.cache_dir
            )
            self.model.eval()

            self.pipeline = pipeline(
                "text-classification",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if torch.cuda.is_available() else -1,
                return_all_scores=True,
            )
            self._loaded = True
            logger.info(f"Loaded detector model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load detector model {self.model_name}: {e}")
            raise

    def predict(self, text: str) -> DetectorResult:
        raise NotImplementedError


class RobertaOpenAIDetector(BaseAIDetector):
    def __init__(self, cache_dir: Optional[str] = None):
        super().__init__("roberta-base-openai-detector", cache_dir)

    def predict(self, text: str) -> DetectorResult:
        import time
        start = time.time()

        self.load()

        max_length = 510
        inputs = self.tokenizer(
            text,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
            padding=True,
        )

        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)
            scores = probs[0].cpu().numpy()

        labels = ["Human", "AI"]
        raw_scores = {label: float(score) for label, score in zip(labels, scores)}
        predicted_idx = int(np.argmax(scores))
        label = labels[predicted_idx]
        confidence = float(scores[predicted_idx] * 100)

        processing_time = time.time() - start

        return DetectorResult(
            name="RoBERTa OpenAI Detector",
            label=label,
            confidence=confidence,
            raw_scores=raw_scores,
            processing_time=processing_time,
        )


class GPT2Detector(BaseAIDetector):
    def __init__(self, cache_dir: Optional[str] = None):
        super().__init__("gpt2", cache_dir)

    def predict(self, text: str) -> DetectorResult:
        import time
        start = time.time()

        self.load()

        max_length = 510
        inputs = self.tokenizer(
            text,
            truncation=True,
            max_length=max_length,
            return_tensors="pt",
            padding=True,
        )

        with torch.no_grad():
            outputs = self.model(**inputs, labels=inputs["input_ids"])
            loss = outputs.loss
            perplexity = torch.exp(loss).item()

        # Use perplexity as a heuristic - lower perplexity often indicates AI
        # This is a rough heuristic, not a trained classifier
        threshold = 100
        label = "AI" if perplexity < threshold else "Human"
        confidence = min(100, max(0, (threshold - perplexity) / threshold * 100 + 50))

        raw_scores = {"AI": float(100 - confidence), "Human": float(confidence)}

        processing_time = time.time() - start

        return DetectorResult(
            name="GPT-2 Perplexity Detector",
            label=label,
            confidence=confidence,
            raw_scores=raw_scores,
            processing_time=processing_time,
        )


class EnsembleDetector:
    def __init__(self, cache_dir: Optional[str] = None):
        self.detectors = [
            RobertaOpenAIDetector(cache_dir),
        ]
        self.cache_dir = cache_dir

    def add_detector(self, detector: BaseAIDetector):
        self.detectors.append(detector)

    def predict(self, text: str) -> List[DetectorResult]:
        results = []
        for detector in self.detectors:
            try:
                result = detector.predict(text)
                results.append(result)
            except Exception as e:
                logger.error(f"Detector {detector.model_name} failed: {e}")
                results.append(DetectorResult(
                    name=detector.__class__.__name__,
                    label="Error",
                    confidence=0.0,
                    raw_scores={},
                    processing_time=0.0,
                ))
        return results

    def aggregate_results(self, results: List[DetectorResult]) -> Tuple[str, float, float]:
        if not results:
            return "Unknown", 0.0, 0.0

        valid_results = [r for r in results if r.label != "Error"]
        if not valid_results:
            return "Error", 0.0, 0.0

        ai_votes = sum(1 for r in valid_results if r.label == "AI")
        human_votes = sum(1 for r in valid_results if r.label == "Human")
        total_votes = len(valid_results)

        agreement = max(ai_votes, human_votes) / total_votes if total_votes > 0 else 0

        if ai_votes > human_votes:
            label = "AI"
            confidence = np.mean([r.confidence for r in valid_results if r.label == "AI"])
        elif human_votes > ai_votes:
            label = "Human"
            confidence = np.mean([r.confidence for r in valid_results if r.label == "Human"])
        else:
            label = "Uncertain"
            confidence = np.mean([r.confidence for r in valid_results])

        return label, float(confidence), float(agreement)


def create_detector_ensemble(cache_dir: Optional[str] = None) -> EnsembleDetector:
    return EnsembleDetector(cache_dir)