import numpy as np
import librosa
from scipy.signal import find_peaks
from scipy.spatial.distance import euclidean
from fastdtw import fastdtw


class KaraokeScorer:
	def __init__(self, hop_length=512, frame_length=2048):
		self.hop_length = hop_length
		self.frame_length = frame_length
	
	def load_audio(self, file_path, sr=22050):
		y, sr = librosa.load(file_path, sr=sr)
		return y, sr
	
	def extract_pitch(self, y, sr):
		# PYIN for robust pitch tracking
		f0, voiced_flag, voiced_probs = librosa.pyin(
			y,
			fmin=librosa.note_to_hz('C2'),
			fmax=librosa.note_to_hz('C7'),
			sr=sr,
			hop_length=self.hop_length
		)
		
		times = librosa.frames_to_time(
			np.arange(len(f0)),
			sr=sr,
			hop_length=self.hop_length
		)
		
		return f0, voiced_flag, times
	
	def extract_onset_envelope(self, y, sr):
		onset_env = librosa.onset.onset_strength(
			y=y,
			sr=sr,
			hop_length=self.hop_length
		)
		
		times = librosa.frames_to_time(
			np.arange(len(onset_env)),
			sr=sr,
			hop_length=self.hop_length
		)
		
		return onset_env, times
	
	def detect_note_onsets(self, onset_env, times, threshold=0.3):
		# Normalize and find peaks
		onset_norm = onset_env / np.max(onset_env) if np.max(onset_env) > 0 else onset_env
		peaks, _ = find_peaks(onset_norm, height=threshold, distance=10)
		
		onset_times = times[peaks]
		return onset_times
	
	def hz_to_cents(self, freq, ref_freq=440.0):
		if freq <= 0 or ref_freq <= 0:
			return 0
		return 1200 * np.log2(freq / ref_freq)
	
	def calculate_pitch_score(self, ref_pitch, user_pitch, ref_voiced, user_voiced):
		# Filter out unvoiced regions
		ref_valid = ~np.isnan(ref_pitch) & ref_voiced
		user_valid = ~np.isnan(user_pitch) & user_voiced
		
		# Convert to cents for comparison
		ref_cents = np.array([
			self.hz_to_cents(f) if ref_valid[i] else 0
			for i, f in enumerate(ref_pitch)
		])
		
		user_cents = np.array([
			self.hz_to_cents(f) if user_valid[i] else 0
			for i, f in enumerate(user_pitch)
		])

		# DTW alignment
		ref_cents_2d = ref_cents.reshape(-1, 1)
		user_cents_2d = user_cents.reshape(-1, 1)
		distance, path = fastdtw(ref_cents_2d, user_cents_2d, dist=euclidean)
		
		# Calculate frame-by-frame pitch errors
		pitch_errors = []
		for ref_idx, user_idx in path:
			if ref_valid[ref_idx] and user_valid[user_idx]:
				# Error in cents
				error = abs(ref_cents[ref_idx] - user_cents[user_idx])
				pitch_errors.append(error)
		
		if len(pitch_errors) == 0:
			return 0, {"mean_error": 0, "accuracy_50": 0, "accuracy_100": 0}
		
		pitch_errors = np.array(pitch_errors)
		mean_error = np.mean(pitch_errors)
		
		# Calculate accuracy at different tolerances
		# Within 50 cents (half semitone) - good
		# Within 100 cents (1 semitone) - meh
		accuracy_50 = np.sum(pitch_errors <= 50) / len(pitch_errors) * 100
		accuracy_100 = np.sum(pitch_errors <= 100) / len(pitch_errors) * 100
		
		# Score calculation: exponential decay based on mean error
		# Perfect = 100, 50 cents error = ~70, 100 cents = ~50
		pitch_score = 100 * np.exp(-mean_error / 75)
		pitch_score = min(100, max(0, pitch_score))
		
		accuracy_details = {
			"mean_error_cents": mean_error,
			"accuracy_within_50_cents": accuracy_50,
			"accuracy_within_100_cents": accuracy_100,
			"dtw_distance": distance
		}
		
		return pitch_score, accuracy_details
	
	def calculate_rhythm_score(self, ref_onsets, user_onsets, tolerance=0.15):
		if len(ref_onsets) == 0 or len(user_onsets) == 0:
			return 0, {"matched": 0, "missed": len(ref_onsets), "extra": len(user_onsets)}
		
		matched = 0
		timing_errors = []
		
		for ref_time in ref_onsets:
			time_diffs = np.abs(user_onsets - ref_time)
			min_diff = np.min(time_diffs)
			
			if min_diff <= tolerance:
				matched += 1
				timing_errors.append(min_diff)
		
		# Calculate scores
		recall = matched / len(ref_onsets) if len(ref_onsets) > 0 else 0
		precision = matched / len(user_onsets) if len(user_onsets) > 0 else 0
		f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
		
		mean_timing_error = np.mean(timing_errors) if len(timing_errors) > 0 else tolerance
		
		timing_accuracy = (1 - mean_timing_error / tolerance) * 100
		rhythm_score = (f1_score * 0.7 + timing_accuracy / 100 * 0.3) * 100
		rhythm_score = min(100, max(0, rhythm_score))
		
		rhythm_details = {
			"matched_notes": matched,
			"total_reference_notes": len(ref_onsets),
			"total_user_notes": len(user_onsets),
			"precision": precision * 100,
			"recall": recall * 100,
			"f1_score": f1_score * 100,
			"mean_timing_error_ms": mean_timing_error * 1000
		}
		
		return rhythm_score, rhythm_details
	
	def score_performance(self, reference_file, user_file, pitch_weight=0.7, rhythm_weight=0.3):
		print("Loading audio files...")
		ref_audio, ref_sr = librosa.load(reference_file, sr=22050)
		user_audio, user_sr = librosa.load(user_file, sr=22050)
		
		print("Extracting pitch...")
		ref_pitch, ref_voiced, ref_times = self.extract_pitch(ref_audio, ref_sr)
		user_pitch, user_voiced, user_times = self.extract_pitch(user_audio, user_sr)
		
		print("Analyzing rhythm...")
		ref_onset_env, _ = self.extract_onset_envelope(ref_audio, ref_sr)
		user_onset_env, _ = self.extract_onset_envelope(user_audio, user_sr)
		
		ref_onsets = self.detect_note_onsets(ref_onset_env, ref_times)
		user_onsets = self.detect_note_onsets(user_onset_env, user_times)
		
		print("Calculating scores...")
		pitch_score, pitch_details = self.calculate_pitch_score(
			ref_pitch, user_pitch, ref_voiced, user_voiced
		)
		
		rhythm_score, rhythm_details = self.calculate_rhythm_score(
			ref_onsets, user_onsets
		)
		
		overall_score = pitch_score * pitch_weight + rhythm_score * rhythm_weight
		
		results = {
			"overall_score": round(overall_score, 2),
			"pitch_score": round(pitch_score, 2),
			"rhythm_score": round(rhythm_score, 2),
			"pitch_details": pitch_details,
			"rhythm_details": rhythm_details,
			"weights": {
				"pitch": pitch_weight,
				"rhythm": rhythm_weight
			}
		}
		
		return results
	
	def print_results(self, results):
		print("\n" + "="*60)
		print("KARAOKE SCORING RESULTS")
		print("="*60)
		print(f"\nOVERALL SCORE: {results['overall_score']:.2f}/100")
		print(f"\nComponent Scores:")
		print(f"- Pitch Accuracy:  {results['pitch_score']:.2f}/100 (weight: {results['weights']['pitch']*100:.0f}%)")
		print(f"- Rhythm Accuracy: {results['rhythm_score']:.2f}/100 (weight: {results['weights']['rhythm']*100:.0f}%)")
		
		print(f"\nPitch Details:")
		pd = results['pitch_details']
		print(f"- Mean Error: {pd['mean_error_cents']:.1f} cents")
		print(f"- Within 50 cents:  {pd['accuracy_within_50_cents']:.1f}%")
		print(f"- Within 100 cents: {pd['accuracy_within_100_cents']:.1f}%")
		
		print(f"\nRhythm Details:")
		rd = results['rhythm_details']
		print(f"- Matched Notes: {rd['matched_notes']}/{rd['total_reference_notes']}")
		print(f"- Precision: {rd['precision']:.1f}%")
		print(f"- Recall: {rd['recall']:.1f}%")
		print(f"- Mean Timing Error: {rd['mean_timing_error_ms']:.1f}ms")
		print("="*60 + "\n")


if __name__ == "__main__":
	scorer = KaraokeScorer()

	reference_file = "samples/Geese - Husbands/vocals.wav"
	user_file = "samples/Geese - Husbands/vocals.wav"

	results = scorer.score_performance(reference_file, user_file)
	scorer.print_results(results)