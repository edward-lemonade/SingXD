import json
import argparse
import numpy as np
from moviepy import TextClip, VideoClip, CompositeVideoClip, CompositeAudioClip, ImageClip, AudioFileClip

def render_video(alignment_json, sync_points_json, background_path, instrumental_path, vocal_path, output_path, fps=30):
	alignment = json.loads(alignment_json)
	sync_points = json.loads(sync_points_json)

	total_duration = max(sp['end'] for sp in sync_points) if sync_points else 0

	bg_clip = ImageClip(background_path, duration=total_duration)

	all_clips = []

	for line in alignment['lines']:
		print(f"Rendering line: {line['words']} from {line['start']} to {line['end']}")

		words = line['words']
		start = line['start']
		end = line['end']
		first_idx = line['firstWordIndex']
		line_sync = sync_points[first_idx:first_idx + len(words)]

		# Center Y position for the line
		line_text = " ".join(words)
		ref_clip = TextClip(text=line_text, font_size=60, stroke_width=2)
		y = (bg_clip.h - ref_clip.h) / 2

		# Calculate starting X to center the entire line
		line_width = ref_clip.w
		start_x = (bg_clip.w - line_width) / 2

		# Render each word individually
		current_x = start_x
		for i, word in enumerate(words):
			sp = line_sync[i]
			
			# White version (shows before word is sung)
			white_word = TextClip(
				text=word + " ",
				font_size=60,
				color="white",
				stroke_color="black",
				stroke_width=2
			).with_position((current_x, y)).with_start(start).with_end(sp['start'])
			
			# Yellow version (shows during word)
			yellow_word = TextClip(
				text=word + " ",
				font_size=60,
				color="yellow",
				stroke_color="black",
				stroke_width=2
			).with_position((current_x, y)).with_start(sp['start']).with_end(sp['end'])
			
			# White version again (shows after word is sung)
			white_word_after = TextClip(
				text=word + " ",
				font_size=60,
				color="yellow",
				stroke_color="black",
				stroke_width=2
			).with_position((current_x, y)).with_start(sp['end']).with_end(end)
			
			all_clips.extend([white_word, yellow_word, white_word_after])
			
			# Move x position for next word
			word_clip = TextClip(text=word + " ", font_size=60, stroke_width=2)
			current_x += word_clip.w

	video = CompositeVideoClip([bg_clip] + all_clips)

	instrumental_clip = AudioFileClip(instrumental_path)
	vocal_clip = AudioFileClip(vocal_path)
	audio = CompositeAudioClip([instrumental_clip, vocal_clip])

	final_video = video.with_audio(audio)
	final_video.write_videofile(output_path, fps=fps, codec="libx264")

	print(f"Rendered video → {output_path}")


if __name__ == "__main__":
	parser = argparse.ArgumentParser(description="Generate video from alignment and audio")
	parser.add_argument("alignment_json", help="JSON string of ResolvedAlignment")
	parser.add_argument("sync_points_json", help="JSON string of sync points")
	parser.add_argument("background_path", help="Path to background image")
	parser.add_argument("instrumental_path", help="Path to instrumental audio")
	parser.add_argument("vocal_path", help="Path to vocal audio")
	parser.add_argument("output_path", help="Path to output video")
	args = parser.parse_args()

	render_video(args.alignment_json, args.sync_points_json, args.background_path, args.instrumental_path, args.vocal_path, args.output_path)