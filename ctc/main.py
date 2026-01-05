"""
wav2vec 2.0 + CTC word-level forced aligner
Supports long audio via chunking + overlap

Requirements:
  pip install torch torchaudio transformers ctc-segmentation soundfile
"""

import re
import argparse
import torch
import torchaudio
import numpy as np
import soundfile as sf

from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
from ctc_segmentation import *


# -------------------------
# Text loading
# -------------------------

def load_word_transcript(path):
	with open(path, "r", encoding="utf-8") as f:
		words = [line.strip().upper() for line in f if line.strip()]
	return words

# -------------------------
# Audio loading
# -------------------------

def load_audio(path: str, target_sr=16000):
	audio, sr = sf.read(path)
	if audio.ndim > 1:
		audio = audio.mean(axis=1)

	if sr != target_sr:
		import librosa
		audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)

	return torch.tensor(audio, dtype=torch.float32), target_sr


# -------------------------
# Chunking
# -------------------------

def chunk_audio(waveform, sr, chunk_sec=20.0, overlap_sec=4.0):
	chunk_len = int(chunk_sec * sr)
	overlap_len = int(overlap_sec * sr)
	step = chunk_len - overlap_len

	chunks = []
	start = 0
	while start < len(waveform):
		end = min(start + chunk_len, len(waveform))
		chunks.append((start, end, waveform[start:end]))
		if end == len(waveform):
			break
		start += step

	return chunks


# -------------------------
# wav2vec logits
# -------------------------

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
	# Return input length in seconds (samples / sr) so index_duration has units of seconds
	return logits[0].cpu().numpy(), inputs["input_values"].shape[1] / sr


# -------------------------
# Word-level CTC alignment
# -------------------------

def ctc_align_words(logits, input_len, words, char_list):
	config = CtcSegmentationParameters()
	config.char_list = char_list
	config.index_duration = input_len / logits.shape[0]

	# Validate characters first
	valid_tokens = set(char_list)
	for w in words:
		for c in w:
			if c not in valid_tokens:
				raise ValueError(f"Invalid token '{c}' not in wav2vec vocabulary")
	
	# Prepare ground truth using the library's function
	# Each word is treated as a separate utterance
	ground_truth_mat, utt_begin_indices = prepare_text(config, words)
	timings, char_probs, state_list = ctc_segmentation(config, logits, ground_truth_mat)
	segments = determine_utterance_segments(config, utt_begin_indices, char_probs, timings, words)

	return segments

# -------------------------
# Main alignment pipeline
# -------------------------

def align_long_audio(
	audio_path,
	transcript_path,
	model_name="facebook/wav2vec2-large-960h",
	chunk_sec=20.0,
	overlap_sec=4.0,
	device="cuda" if torch.cuda.is_available() else "cpu"
):
	print(f"Loading model: {model_name}")
	processor = Wav2Vec2Processor.from_pretrained(model_name)
	model = Wav2Vec2ForCTC.from_pretrained(model_name).to(device)
	model.eval()

	print("Loading audio")
	waveform, sr = load_audio(audio_path)

	print("Loading transcript")
	words = load_word_transcript(transcript_path)

	chunks = chunk_audio(waveform, sr, chunk_sec, overlap_sec)
	print(f"Total chunks: {len(chunks)}")

	results = []
	word_cursor = 0
	rewind_words = 0  # soft rewind to prevent drift

	vocab = processor.tokenizer.get_vocab()

	# Build index → char list
	char_list = [None] * len(vocab)
	for char, idx in vocab.items():
		char_list[idx] = char

	for i, (samp_start, samp_end, chunk_wave) in enumerate(chunks):
		chunk_start_sec = samp_start / sr

		start_idx = max(0, word_cursor - rewind_words)
		window_words = words[start_idx:]

		if not window_words:
			break

		# Debug: show cursor and window size
		print(f"[chunk {i}] word_cursor={word_cursor} start_idx={start_idx} window_words={len(window_words)}")

		logits, input_len = wav2vec_logits(model, processor, chunk_wave, sr, device)

		print(f"[chunk {i}] aligning {len(window_words)} words")
		
		try:
			segments = ctc_align_words(logits, input_len, window_words, char_list)
		except Exception as e:
			print(f"[chunk {i}] alignment failed: {e}")
			continue
		
		#segments = ctc_align_words(logits, input_len, window_words, char_list)

		# Alignment thresholds
		CONF_THRESHOLD = 0
		MIN_DURATION = 0

		consumed = 0
		for idx, seg in enumerate(segments):
			# seg is a tuple: (start, end, min_avg)
			start, end, min_avg = seg
			abs_word_idx = start_idx + idx
			print(start, end, min_avg, words[abs_word_idx], abs_word_idx, word_cursor)

			# Skip words that were already consumed by earlier chunks
			if abs_word_idx < word_cursor:
				continue

			# Filter by confidence and duration
			if min_avg < CONF_THRESHOLD or (end - start) < MIN_DURATION:
				# If this is the next expected word in sequence, stop consuming further words
				if abs_word_idx == word_cursor:
					break
				else:
					# otherwise skip this word but allow later words to be added
					continue

			abs_start = chunk_start_sec + start
			abs_end = chunk_start_sec + end

			results.append({
				"word": words[abs_word_idx],
				"start": abs_start,
				"end": abs_end,
				"confidence": float(min_avg)
			})

			# Advance cursor only for consecutive words starting at the current cursor
			if abs_word_idx == word_cursor:
				consumed += 1
				word_cursor += 1

		# Debug: report how many words consumed in this chunk
		print(f"[chunk {i}] consumed={consumed} new_cursor={word_cursor}")

# -------------------------

def main():
	parser = argparse.ArgumentParser()
	parser.add_argument("audio", help="audio wav file")
	parser.add_argument("transcript", help="transcript text file")
	parser.add_argument("--chunk", type=float, default=20.0)
	parser.add_argument("--overlap", type=float, default=4.0)
	parser.add_argument("--model", default="facebook/wav2vec2-large-960h")
	parser.add_argument("--out", default="word_alignment.txt")

	args = parser.parse_args()

	results = align_long_audio(
		args.audio,
		args.transcript,
		model_name=args.model,
		chunk_sec=args.chunk,
		overlap_sec=args.overlap
	)

	with open(args.out, "w", encoding="utf-8") as f:
		for r in results:
			f.write(
				f"{r['start']:.3f}\t{r['end']:.3f}\t"
				f"{r['confidence']:.3f}\t{r['word']}\n"
			)

	print(f"Wrote word-level alignment to {args.out}")


if __name__ == "__main__":
	main()
