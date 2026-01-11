import json
import argparse
import numpy as np
from moviepy import TextClip, VideoClip, CompositeVideoClip, CompositeAudioClip, ImageClip, AudioFileClip

def render_video(alignment_json, sync_points_json, background_path, instrumental_path, vocal_path, output_path, fps=30):
	alignment = json.loads(alignment_json)
	sync_points = json.loads(sync_points_json)

	total_duration = max(sp['end'] for sp in sync_points) if sync_points else 0

	bg_clip = ImageClip(background_path, duration=total_duration)

	text_clips = []
	text_clips = []

	for line in alignment['lines']:
		print(f"Rendering line: {line['words']} from {line['start']} to {line['end']}")

		words = line['words']
		start = line['start']
		end = line['end']
		first_idx = line['firstWordIndex']
		line_sync = sync_points[first_idx:first_idx + len(words)]
		duration = end - start

		line_text = " ".join(words)

		# --- render base & highlight text ONCE ---
		base = TextClip(
			text=line_text,
			font_size=60,
			color="white",
			stroke_color="black",
			stroke_width=2
		).with_start(start).with_duration(duration)

		highlight = TextClip(
			text=line_text,
			font_size=60,
			color="yellow",
			stroke_color="black",
			stroke_width=2
		).with_start(start).with_duration(duration)

		# --- center position ---
		x = (bg_clip.w - base.w) / 2
		y = (bg_clip.h - base.h) / 2

		base = base.with_position((x, y))
		highlight = highlight.with_position((x, y))

		# --- measure cumulative word widths ---
		def word_width(txt):
			return TextClip(
				text=txt,
				font_size=60,
				stroke_width=2
			).w

		cumulative_widths = []
		current = ""
		for w in words:
			current += w + " "
			cumulative_widths.append(word_width(current))

		# --- animated mask ---
		h, w = base.h, base.w

		def make_mask(t):
			absolute_t = t + start

			reveal_width = 0
			for i, sp in enumerate(line_sync):
				if absolute_t >= sp["end"]:
					reveal_width = cumulative_widths[i]
				elif sp["start"] <= absolute_t < sp["end"]:
					progress = (
						(absolute_t - sp["start"]) /
						(sp["end"] - sp["start"])
					)
					reveal_width = (
						cumulative_widths[i - 1] if i > 0 else 0
					) + progress * (
						cumulative_widths[i] -
						(cumulative_widths[i - 1] if i > 0 else 0)
					)
					break

			mask = np.zeros((h, w))
			mask[:, :int(reveal_width)] = 1
			return mask

		mask_clip = VideoClip(
			make_mask,
			is_mask=True
		).with_start(start).with_duration(duration)

		highlight = highlight.with_mask(mask_clip)

		text_clips.extend([base, highlight])
		
	video = CompositeVideoClip([bg_clip, *text_clips])

	instrumental_clip = AudioFileClip(instrumental_path)
	vocal_clip = AudioFileClip(vocal_path)
	print(instrumental_path, instrumental_clip.duration)
	audio = CompositeAudioClip([instrumental_clip, vocal_clip])

	final_video = video.with_audio(audio)

	final_video.write_videofile(output_path, fps=fps, codec="libx264")

	print(f"Rendered video → {output_path}")


if __name__ == "__main__":
	print("here")
	parser = argparse.ArgumentParser(description="Generate video from alignment and audio")
	parser.add_argument("alignment_json", help="JSON string of ResolvedAlignment")
	parser.add_argument("sync_points_json", help="JSON string of sync points")
	parser.add_argument("background_path", help="Path to background image")
	parser.add_argument("instrumental_path", help="Path to instrumental audio")
	parser.add_argument("vocal_path", help="Path to vocal audio")
	parser.add_argument("output_path", help="Path to output video")
	args = parser.parse_args()

	render_video(args.alignment_json, args.sync_points_json, args.background_path, args.instrumental_path, args.vocal_path, args.output_path)