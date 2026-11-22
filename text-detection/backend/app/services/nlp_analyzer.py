import re
import math
import nltk
import numpy as np
from collections import Counter
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import textstat

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab', quiet=True)

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger', quiet=True)

try:
    nltk.data.find('taggers/averaged_perceptron_tagger_eng')
except LookupError:
    nltk.download('averaged_perceptron_tagger_eng', quiet=True)


@dataclass
class TextStatistics:
    character_count: int
    word_count: int
    sentence_count: int
    paragraph_count: int
    avg_word_length: float
    avg_sentence_length: float
    type_token_ratio: float
    hapax_legomena_ratio: float


@dataclass
class LinguisticFeatures:
    statistics: TextStatistics
    perplexity_scores: List[float]
    burstiness_score: float
    repetition_score: float
    sentence_length_variance: float
    pos_distribution: Dict[str, float]
    function_word_ratio: float
    readability_scores: Dict[str, float]
    ngram_entropy: Dict[int, float]


class TextPreprocessor:
    @staticmethod
    def clean_text(text: str) -> str:
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text

    @staticmethod
    def split_paragraphs(text: str) -> List[str]:
        paragraphs = re.split(r'\n\s*\n', text.strip())
        return [p.strip() for p in paragraphs if p.strip()]

    @staticmethod
    def tokenize_sentences(text: str) -> List[str]:
        return nltk.sent_tokenize(text)

    @staticmethod
    def tokenize_words(text: str) -> List[str]:
        return nltk.word_tokenize(text.lower())

    @staticmethod
    def pos_tag(text: str) -> List[Tuple[str, str]]:
        words = nltk.word_tokenize(text)
        return nltk.pos_tag(words)


class StatisticsAnalyzer:
    @staticmethod
    def compute_statistics(text: str) -> TextStatistics:
        words = TextPreprocessor.tokenize_words(text)
        sentences = TextPreprocessor.tokenize_sentences(text)
        paragraphs = TextPreprocessor.split_paragraphs(text)

        word_count = len(words)
        unique_words = set(words)
        word_freq = Counter(words)

        hapax_count = sum(1 for w, c in word_freq.items() if c == 1)

        avg_word_length = np.mean([len(w) for w in words]) if words else 0
        avg_sentence_length = word_count / len(sentences) if sentences else 0

        return TextStatistics(
            character_count=len(text),
            word_count=word_count,
            sentence_count=len(sentences),
            paragraph_count=len(paragraphs),
            avg_word_length=avg_word_length,
            avg_sentence_length=avg_sentence_length,
            type_token_ratio=len(unique_words) / word_count if word_count > 0 else 0,
            hapax_legomena_ratio=hapax_count / word_count if word_count > 0 else 0,
        )

    @staticmethod
    def compute_pos_distribution(text: str) -> Dict[str, float]:
        tagged = TextPreprocessor.pos_tag(text)
        if not tagged:
            return {}

        pos_counts = Counter(tag for _, tag in tagged)
        total = len(tagged)
        return {pos: count / total for pos, count in pos_counts.items()}

    @staticmethod
    def compute_function_word_ratio(text: str) -> float:
        function_words = {
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
            'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
            'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
            'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
            'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
            'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
            'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
        }

        words = TextPreprocessor.tokenize_words(text)
        if not words:
            return 0.0

        function_count = sum(1 for w in words if w in function_words)
        return function_count / len(words)

    @staticmethod
    def compute_readability(text: str) -> Dict[str, float]:
        try:
            return {
                'flesch_reading_ease': textstat.flesch_reading_ease(text),
                'flesch_kincaid_grade': textstat.flesch_kincaid_grade(text),
                'gunning_fog': textstat.gunning_fog(text),
                'automated_readability_index': textstat.automated_readability_index(text),
                'coleman_liau_index': textstat.coleman_liau_index(text),
                'dale_chall_readability_score': textstat.dale_chall_readability_score(text),
            }
        except Exception:
            return {}

    @staticmethod
    def compute_ngram_entropy(text: str, max_n: int = 4) -> Dict[int, float]:
        words = TextPreprocessor.tokenize_words(text)
        if len(words) < 2:
            return {n: 0.0 for n in range(1, max_n + 1)}

        entropies = {}
        for n in range(1, max_n + 1):
            if len(words) < n:
                entropies[n] = 0.0
                continue

            ngrams = [' '.join(words[i:i+n]) for i in range(len(words) - n + 1)]
            if not ngrams:
                entropies[n] = 0.0
                continue

            freq = Counter(ngrams)
            total = len(ngrams)
            probs = [count / total for count in freq.values()]
            entropy = -sum(p * math.log2(p) for p in probs if p > 0)
            entropies[n] = entropy

        return entropies


class PerplexityAnalyzer:
    def __init__(self, model_name: str = "gpt2", cache_dir: Optional[str] = None):
        self.model_name = model_name
        self.cache_dir = cache_dir
        self._model = None
        self._tokenizer = None
        self._enabled = True  # Can be disabled to avoid memory issues

    def disable(self):
        """Disable perplexity analysis to avoid memory issues in background tasks."""
        self._enabled = False

    def _load_model(self):
        if self._model is None:
            from transformers import AutoModelForCausalLM, AutoTokenizer
            import torch

            self._tokenizer = AutoTokenizer.from_pretrained(
                self.model_name, cache_dir=self.cache_dir
            )
            if self._tokenizer.pad_token is None:
                self._tokenizer.pad_token = self._tokenizer.eos_token

            self._model = AutoModelForCausalLM.from_pretrained(
                self.model_name, cache_dir=self.cache_dir
            )
            self._model.eval()

    def compute_perplexity(self, text: str, window_size: int = 100) -> List[float]:
        if not self._enabled:
            return []  # Return empty list instead of NaN
        try:
            self._load_model()
            import torch

            inputs = self._tokenizer(
                text, return_tensors="pt", truncation=True, max_length=512
            )

            with torch.no_grad():
                outputs = self._model(**inputs, labels=inputs["input_ids"])
                loss = outputs.loss
                perplexity = torch.exp(loss).item()

            return [perplexity]
        except Exception as e:
            print(f"Perplexity computation failed: {e}")
            return []

    def compute_sliding_perplexity(self, text: str, window_size: int = 100) -> List[float]:
        if not self._enabled:
            return []  # Return empty list instead of NaN
        try:
            self._load_model()
            import torch

            tokens = self._tokenizer.encode(text, add_special_tokens=False)
            if len(tokens) < window_size:
                return self.compute_perplexity(text)

            perplexities = []
            stride = window_size // 2

            for i in range(0, len(tokens) - window_size + 1, stride):
                window_tokens = tokens[i:i + window_size]
                input_ids = torch.tensor([window_tokens])

                with torch.no_grad():
                    outputs = self._model(input_ids, labels=input_ids)
                    loss = outputs.loss
                    ppl = torch.exp(loss).item()
                    perplexities.append(ppl)

            return perplexities if perplexities else []
        except Exception as e:
            print(f"Sliding perplexity computation failed: {e}")
            return []


class BurstinessAnalyzer:
    @staticmethod
    def compute_burstiness(sentence_lengths: List[int]) -> float:
        if len(sentence_lengths) < 2:
            return 0.0

        mean_len = np.mean(sentence_lengths)
        if mean_len == 0:
            return 0.0

        variance = np.var(sentence_lengths)
        return variance / mean_len


class RepetitionAnalyzer:
    @staticmethod
    def compute_repetition_score(text: str, n: int = 3) -> float:
        words = TextPreprocessor.tokenize_words(text)
        if len(words) < n:
            return 0.0

        ngrams = [' '.join(words[i:i+n]) for i in range(len(words) - n + 1)]
        if not ngrams:
            return 0.0

        freq = Counter(ngrams)
        total = len(ngrams)
        repeated = sum(count - 1 for count in freq.values() if count > 1)
        return repeated / total if total > 0 else 0.0

    @staticmethod
    def compute_self_similarity(text: str) -> float:
        sentences = TextPreprocessor.tokenize_sentences(text)
        if len(sentences) < 2:
            return 0.0

        sentence_vectors = []
        for sent in sentences:
            words = set(TextPreprocessor.tokenize_words(sent))
            sentence_vectors.append(words)

        similarities = []
        for i in range(len(sentence_vectors)):
            for j in range(i + 1, len(sentence_vectors)):
                set1, set2 = sentence_vectors[i], sentence_vectors[j]
                if not set1 or not set2:
                    continue
                intersection = len(set1 & set2)
                union = len(set1 | set2)
                similarities.append(intersection / union if union > 0 else 0)

        return np.mean(similarities) if similarities else 0.0


class LinguisticAnalyzer:
    def __init__(self, perplexity_model: str = "gpt2", cache_dir: Optional[str] = None, enable_perplexity: bool = False):
        self.stats_analyzer = StatisticsAnalyzer()
        self.perplexity_analyzer = PerplexityAnalyzer(perplexity_model, cache_dir)
        if not enable_perplexity:
            self.perplexity_analyzer.disable()
        self.burstiness_analyzer = BurstinessAnalyzer()
        self.repetition_analyzer = RepetitionAnalyzer()

    def analyze(self, text: str) -> LinguisticFeatures:
        clean_text = TextPreprocessor.clean_text(text)

        statistics = self.stats_analyzer.compute_statistics(clean_text)
        pos_distribution = self.stats_analyzer.compute_pos_distribution(clean_text)
        function_word_ratio = self.stats_analyzer.compute_function_word_ratio(clean_text)
        readability = self.stats_analyzer.compute_readability(clean_text)
        ngram_entropy = self.stats_analyzer.compute_ngram_entropy(clean_text)

        sentences = TextPreprocessor.tokenize_sentences(clean_text)
        sentence_lengths = [len(TextPreprocessor.tokenize_words(s)) for s in sentences]
        burstiness = self.burstiness_analyzer.compute_burstiness(sentence_lengths)
        sentence_length_variance = np.var(sentence_lengths) if sentence_lengths else 0

        repetition = self.repetition_analyzer.compute_repetition_score(clean_text)

        perplexity_scores = self.perplexity_analyzer.compute_sliding_perplexity(clean_text)

        return LinguisticFeatures(
            statistics=statistics,
            perplexity_scores=perplexity_scores,
            burstiness_score=burstiness,
            repetition_score=repetition,
            sentence_length_variance=sentence_length_variance,
            pos_distribution=pos_distribution,
            function_word_ratio=function_word_ratio,
            readability_scores=readability,
            ngram_entropy=ngram_entropy,
        )


def analyze_text_linguistics(text: str, cache_dir: Optional[str] = None, enable_perplexity: bool = False) -> LinguisticFeatures:
    analyzer = LinguisticAnalyzer(cache_dir=cache_dir, enable_perplexity=enable_perplexity)
    return analyzer.analyze(text)