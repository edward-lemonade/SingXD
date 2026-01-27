import json
import argparse
import numpy as np
from moviepy import TextClip, VideoClip, CompositeVideoClip, CompositeAudioClip, ImageClip, AudioFileClip
from PIL import Image

# Standard video dimensions
STANDARD_WIDTH = 1920
STANDARD_HEIGHT = 1080

def resize_and_pad(image_path, target_width, target_height):
	"""Resize image to fit within target dimensions and pad to exact size"""
	image = Image.open(image_path)
	
	# Calculate scaling to fit within bounds
	width_ratio = target_width / image.width
	height_ratio = target_height / image.height
	scale_ratio = min(width_ratio, height_ratio)
	
	# Resize image
	new_width = int(image.width * scale_ratio)
	new_height = int(image.height * scale_ratio)
	resized = image.resize((new_width, new_height), Image.LANCZOS)
	
	# Create new image with padding (black bars)
	padded = Image.new('RGB', (target_width, target_height), (0, 0, 0))
	
	# Center the resized image
	x_offset = (target_width - new_width) // 2
	y_offset = (target_height - new_height) // 2
	padded.paste(resized, (x_offset, y_offset))
	
	return np.array(padded)

def render_video(alignment_json, sync_points_json, background_path, instrumental_path, vocal_path, output_path, fps=30):
	alignment = json.loads(alignment_json)
	sync_points = json.loads(sync_points_json)

	total_duration = max(sp['end'] for sp in sync_points) if sync_points else 0

	# Resize and pad background to standard dimensions
	bg_array = resize_and_pad(background_path, STANDARD_WIDTH, STANDARD_HEIGHT)
	bg_clip = ImageClip(bg_array, duration=total_duration)

	all_clips = []
	
	MARGIN = 50  # Adjust this to prevent cropping
	VERTICAL_POSITION = 0.75  # 0.0 = top, 0.5 = center, 1.0 = bottom

	for line in alignment['lines']:
		print(f"Rendering line: {line['words']} from {line['start']} to {line['end']}")

		words = line['words']
		start = line['start']
		end = line['end']
		first_idx = line['firstWordIndex']
		line_sync = sync_points[first_idx:first_idx + len(words)]

		# Create reference clip for the full line to get baseline position (without margin)
		line_text = " ".join(words)
		ref_clip = TextClip(
			text=line_text, 
			font_size=60, 
			stroke_width=2
		)
		
		# Position the line lower on the screen (75% down from top) - use STANDARD_HEIGHT
		line_y = STANDARD_HEIGHT * VERTICAL_POSITION - ref_clip.h / 2
		
		# Calculate starting X to center the entire line - use STANDARD_WIDTH
		line_width = ref_clip.w
		start_x = (STANDARD_WIDTH - line_width) / 2

		# Render each word individually with consistent positioning
		current_x = start_x
		for i, word in enumerate(words):
			sp = line_sync[i]
			
			# Calculate the width without margin for positioning
			word_width_no_margin = TextClip(
				text=word + " ", 
				font_size=60, 
				stroke_width=2
			).w
			
			# White version (shows before word is sung)
			white_word = TextClip(
				text=word + " ",
				font_size=60,
				color="white",
				stroke_color="black",
				stroke_width=2,
				margin=(MARGIN, MARGIN)
			).with_position((current_x - MARGIN, line_y - MARGIN)).with_start(start).with_end(sp['start'])
			
			# Yellow version (shows during word)
			yellow_word = TextClip(
				text=word + " ",
				font_size=60,
				color="yellow",
				stroke_color="black",
				stroke_width=2,
				margin=(MARGIN, MARGIN)
			).with_position((current_x - MARGIN, line_y - MARGIN)).with_start(sp['start']).with_end(sp['end'])
			
			# White version again (shows after word is sung)
			white_word_after = TextClip(
				text=word + " ",
				font_size=60,
				color="white",
				stroke_color="black",
				stroke_width=2,
				margin=(MARGIN, MARGIN)
			).with_position((current_x - MARGIN, line_y - MARGIN)).with_start(sp['end']).with_end(end)
			
			all_clips.extend([white_word, yellow_word, white_word_after])
			
			# Move x position for next word (using width WITHOUT margin)
			current_x += word_width_no_margin

	# Create composite with explicit size set to standard dimensions
	video = CompositeVideoClip([bg_clip] + all_clips, size=(STANDARD_WIDTH, STANDARD_HEIGHT))

	instrumental_clip = AudioFileClip(instrumental_path)
	vocal_clip = AudioFileClip(vocal_path)
	audio = CompositeAudioClip([instrumental_clip, vocal_clip])

	final_video = video.with_audio(audio)
	final_video.write_videofile(output_path, fps=fps, codec="libx264", preset='medium', bitrate='8000k')

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