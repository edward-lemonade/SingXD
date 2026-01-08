import demucs.separate
from pathlib import Path
import shutil

if __name__ == "__main__":
    song_folder = Path("samples/lucy")
    input_file = song_folder / "raw.mp3"

    demucs.separate.main([
        "--two-stems", "vocals",
        "-n", "mdx_extra",
        "-o", str(song_folder),
        str(input_file)
    ])

    output_folder = song_folder / "mdx_extra" / input_file.stem

    # move/rename stems
    if output_folder.exists():
        for stem_file in output_folder.iterdir():
            if stem_file.stem.lower() == "vocals":
                # vocals.wav -> vocals.wav in song_folder
                shutil.move(str(stem_file), song_folder / "vocals.wav")
            else:
                # no-vocals.wav -> inst.wav in song_folder
                shutil.move(str(stem_file), song_folder / "inst.wav")
                
        shutil.rmtree(output_folder.parent)

    print("DONE")
