import json
import os
from moviepy import TextClip, CompositeVideoClip, CompositeAudioClip, ImageClip, AudioFileClip


def render_video(song_folder, fps=30):
	json_path = f"{song_folder}/map.json"
	background_image_path = f"{song_folder}/cover.jpg"
	audio_path = f"{song_folder}/raw.mp3"
	output_path = f"{song_folder}/video.mp4"

	with open(json_path, "r", encoding="utf-8") as f:
		data = json.load(f)

	# alignment.json style: [ {"word":..., "start":..., "end":..., "confidence":...}, ... ]
	if isinstance(data, list):
		if not data:
			raise ValueError("Alignment JSON contains no entries")

		words = []
		for entry in data:
			start = float(entry.get("start", 0.0))
			end = float(entry.get("end", start + 0.5))
			word = entry.get("word", entry.get("text", ""))
			words.append({"start": start, "end": end, "lines": [word]})


	total_duration = float(words[-1]["end"])

	bg_clip = ImageClip(background_image_path, duration=total_duration)

	text_clips = []
	for word in words:
		start = float(word["start"])
		end = float(word["end"])
		duration = end - start

		text = " ".join(word.get("lines", []))

		text_clip = TextClip(
			text=text,
			font_size=60,
			color="white",
			stroke_color="black",
			stroke_width=2,
			method="caption",
			size=(int(bg_clip.w * 0.8), None),
			text_align="center",
			duration=duration 
		)

		text_clip = text_clip.with_position(("center", "center")).with_start(start)
		text_clips.append(text_clip)

	video = CompositeVideoClip([bg_clip, *text_clips])
	audio = CompositeAudioClip([AudioFileClip(audio_path)])
	final_video = video.with_audio(audio)

	final_video.write_videofile(output_path, fps=fps, codec="libx264")

	print(f"Rendered video → {output_path}")

# -----------------------------------------------------------

if __name__ == "__main__":
	song_folder = "samples/lucy"
	render_video(song_folder)