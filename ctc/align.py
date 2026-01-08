import re
import argparse
import torch
import torchaudio
import numpy as np
import soundfile as sf
import json

from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
from ctc_segmentation import *
from moviepy import TextClip, CompositeVideoClip, CompositeAudioClip, ImageClip, AudioFileClip


def load_word_transcript(path):
	with open(path, "r", encoding="utf-8") as f:
		words = [line.strip().upper() for line in f if line.strip()]
	return words

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
	song_folder,
	model_name="facebook/wav2vec2-large-960h",
	device="cuda" if torch.cuda.is_available() else "cpu"
):
	print(f"Loading model: {model_name}")
	processor = Wav2Vec2Processor.from_pretrained(model_name)
	model = Wav2Vec2ForCTC.from_pretrained(model_name).to(device)
	model.eval()

	print("Loading audio")
	audio_path = f"{song_folder}/vocals.wav"
	waveform, sr = load_audio(audio_path)

	print("Loading transcript")
	transcript_path = f"{song_folder}/lyrics-clean.txt"
	words = load_word_transcript(transcript_path)

	results = []

	vocab = processor.tokenizer.get_vocab()
	char_list = [None] * len(vocab)
	for char, idx in vocab.items():
		char_list[idx] = char

	logits, input_len = wav2vec_logits(model, processor, waveform, sr, device)
	segments = ctc_align_words(logits, input_len, words, char_list)
		
	for idx, seg in enumerate(segments):
		# seg is a tuple: (start, end, min_avg)
		start, end, min_avg = seg

		print(start, end, idx, words[idx])
		results.append({
			"word": words[idx],
			"start": start,
			"end": end,
			"confidence": float(min_avg)
		})
	
	return results

# -----------------------------------------

if __name__ == "__main__":
	song_folder = "samples/lucy"
	results = align_long_audio(song_folder)

	with open(f"{song_folder}/map.json", "w", encoding="utf-8") as f:
		json.dump(results, f, ensure_ascii=False, indent=2)

	print(f"Wrote word-level alignment to {song_folder}/map.json")