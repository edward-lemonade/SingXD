import demucs.separate
from pathlib import Path
import shutil
import sys

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python separator.py <input_file> <output_dir>")
        sys.exit(1)

    input_file = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])

    demucs.separate.main([
        "--two-stems", "vocals",
        "-o", str(output_dir),
        str(input_file)
    ])

    output_folder = output_dir / "htdemucs" / input_file.stem

    # move/rename stems
    if output_folder.exists():
        for stem_file in output_folder.iterdir():
            if stem_file.stem.lower() == "vocals":
                # vocals.wav -> vocals.wav in output_dir
                shutil.move(str(stem_file), output_dir / "vocals.wav")
            else:
                # no-vocals.wav -> inst.wav in output_dir
                shutil.move(str(stem_file), output_dir / "inst.wav")
                
        shutil.rmtree(output_folder.parent)
    else:
        print("Error: Output folder not found:", output_folder)

    print("DONE")
