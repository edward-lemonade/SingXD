import re
import argparse
import torch
import soundfile as sf
import json
import string
import num2words
from collections import defaultdict

from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
from ctc_segmentation import *


def load_transcript(path):
	with open(path, "r", encoding="utf-8") as f:
		return f.read()

def preprocess_text(text):
	# split into original words (keeping punctuation)
	original_words = text.split()
	cleaned_words = []
	mapping = []  # mapping[cleaned_idx] = original_idx
	
	for i, word in enumerate(original_words):
		# remove punctuation and lowercase
		cleaned = re.sub(r'[^\w\s]', '', word).lower()
		# remove double spaces just in case (though split should handle)
		cleaned = re.sub(r'\s+', ' ', cleaned).strip()
		
		if cleaned.isdigit():
			spelled = num2words.num2words(int(cleaned)).replace('-', ' ')
			spelled_words = spelled.split()
			cleaned_words.extend([w.upper() for w in spelled_words])
			mapping.extend([i] * len(spelled_words))
		else:
			cleaned_words.append(cleaned.upper())
			mapping.append(i)
	
	return original_words, cleaned_words, mapping

def load_audio(path: str, target_sr=16000):
	audio, sr = sf.read(path)
	if audio.ndim > 1:
		audio = audio.mean(axis=1)

	if sr != target_sr:
		import librosa
		audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)

	return torch.tensor(audio, dtype=torch.float32), target_sr


def wav2vec_logits(model, processor, waveform, sr, device):
	inputs = processor(
		waveform,
		sampling_rate=sr,
		return_tensors="pt",
		padding=True
	)
	inputs = {k: v.to(device) for k, v in inputs.items()}
	with torch.no_grad():
		logits = model(inputs["input_values"]).logits
	# return input length in seconds (samples / sr) so index_duration has units of seconds
	return logits[0].cpu().numpy(), inputs["input_values"].shape[1] / sr

def ctc_align_words(logits, input_len, words, char_list):
	config = CtcSegmentationParameters()
	config.char_list = char_list
	config.index_duration = input_len / logits.shape[0]

	# validate characters first
	valid_tokens = set(char_list)
	for w in words:
		for c in w:
			if c not in valid_tokens:
				print(c, ord(c))
				raise ValueError(f"Invalid token '{c}' not in wav2vec vocabulary")
	
	ground_truth_mat, utt_begin_indices = prepare_text(config, words)
	timings, char_probs, state_list = ctc_segmentation(config, logits, ground_truth_mat)
	segments = determine_utterance_segments(config, utt_begin_indices, char_probs, timings, words)

	return segments

def align_long_audio(
	audio_path,
	text_path,
	model_name="facebook/wav2vec2-large-960h",
	device="cuda" if torch.cuda.is_available() else "cpu"
):
	print(f"Loading model: {model_name}")
	processor = Wav2Vec2Processor.from_pretrained(model_name)
	model = Wav2Vec2ForCTC.from_pretrained(model_name).to(device)
	model.eval()

	print("Loading audio")
	waveform, sr = load_audio(audio_path)

	print("Loading transcript")
	text = load_transcript(text_path)
	original_words, cleaned_words, mapping = preprocess_text(text)

	results = []

	vocab = processor.tokenizer.get_vocab()
	char_list = [None] * len(vocab)
	for char, idx in vocab.items():
		char_list[idx] = char

	logits, input_len = wav2vec_logits(model, processor, waveform, sr, device)
	segments = ctc_align_words(logits, input_len, cleaned_words, char_list)
	
	# Group segments by original word
	grouped = defaultdict(list)
	for idx, seg in enumerate(segments):
		orig_idx = mapping[idx]
		grouped[orig_idx].append(seg)
	
	for orig_idx in range(len(original_words)):
		if orig_idx in grouped:
			segs = grouped[orig_idx]
			start = min(s[0] for s in segs)
			end = max(s[1] for s in segs)
			confidence = sum(s[2] for s in segs) / len(segs)
			results.append({
				"text": original_words[orig_idx],
				"start": start,
				"end": end,
				"confidence": float(confidence)
			})
	
	return results

# -----------------------------------------

if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Align audio with text using CTC segmentation")
	parser.add_argument("input_audio", help="Path to input audio file")
	parser.add_argument("input_text", help="Path to input text file")
	parser.add_argument("output_json", help="Path to output JSON file")
	args = parser.parse_args()

	results = align_long_audio(args.input_audio, args.input_text)

	with open(args.output_json, "w", encoding="utf-8") as f:
		json.dump(results, f, ensure_ascii=False, indent=2)

	print(f"Wrote word-level alignment to {args.output_json}")