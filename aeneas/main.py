import json
from aeneas.task import Task
from aeneas.executetask import ExecuteTask
from moviepy import TextClip, CompositeVideoClip, CompositeAudioClip, ImageClip, AudioFileClip

def clean_lyrics(song_folder):
	import re
	# Read original lyrics
	with open(song_folder + "/lyrics.txt", "r", encoding="utf-8") as fin:
		text = fin.read()
	# Normalize whitespace and remove commas explicitly
	text = text.replace("\r\n", " ").replace("\n", " ")
	text = text.replace(",", "")
	# Remove any other non-alphanumeric characters (keep spaces) and collapse whitespace
	text = re.sub(r"[^A-Za-z0-9 ]+", "", text)
	text = re.sub(r"\s+", " ", text).strip()
	# Split into words and write one per line
	words = [w for w in text.split(" ") if w]
	with open(song_folder + "/lyrics-clean.txt", "w", encoding="utf-8") as fout:
		fout.write("\n".join(words))
	print("Cleaned lyrics saved → " + song_folder + "/lyrics-clean.txt")


def run_aeneas_alignment(song_folder, clean=False):
	config = "task_language=eng|is_text_type=plain|os_task_file_format=json"
	
	audio_path = song_folder + "/vocals.wav"
	lyrics_path = song_folder + ("/lyrics-clean.txt" if clean else "/lyrics.txt")
	output_path = song_folder + "/map.json"

	task = Task(config_string=config)
	task.audio_file_path_absolute = audio_path
	task.text_file_path_absolute = lyrics_path
	task.sync_map_file_path_absolute = output_path

	ExecuteTask(task).execute()
	task.output_sync_map_file()

	print(f"Aeneas alignment complete → " + output_path)


def render_video(song_folder, font, fps=30):
	json_path = f"{song_folder}/map.json"
	background_image_path = f"{song_folder}/cover.jpg"
	audio_path = f"{song_folder}/raw.mp3"
	output_path = f"{song_folder}/video.mp4"

	# Load sync map
	with open(json_path, "r", encoding="utf-8") as f:
		data = json.load(f)

	fragments = data.get("fragments", [])
	if not fragments:
		raise ValueError("JSON contains no fragments")

	# Compute total duration
	total_duration = float(fragments[-1]["end"])

	# Create background clip
	bg_clip = ImageClip(background_image_path, duration=total_duration)

	# Create text clips
	text_clips = []
	for frag in fragments:
		begin = float(frag["begin"])
		end = float(frag["end"])
		duration = end - begin

		text = " ".join(frag.get("lines", []))

		text_clip = TextClip(
			text=text,
			font_size=60,
			font=font,
			color="white",
			stroke_color="black",
			stroke_width=2,
			method="caption",
			size=(int(bg_clip.w * 0.8), None),
			text_align="center",
			duration=duration  # set duration at creation
		)

		# Set position and start time using functional wrappers
		text_clip = text_clip.with_position(("center", "center")).with_start(begin)
		text_clips.append(text_clip)

	# Composite video
	video = CompositeVideoClip([bg_clip, *text_clips])
	audio = CompositeAudioClip([AudioFileClip(audio_path)])
	final_video = video.with_audio(audio)

	# Write video
	final_video.write_videofile(output_path, fps=fps, codec="libx264")

	print(f"Rendered video → {output_path}")

font = "C:\Windows\Fonts\Arial.ttf"

song_folder = "samples/Geese - Husbands"#"samples/Death Grips - Lost Boys"
clean_lyrics(song_folder)
run_aeneas_alignment(song_folder, True)
render_video(song_folder, font)