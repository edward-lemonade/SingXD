import re
from pathlib import Path
from num2words import num2words

def clean_lyrics_file(input_path: str, output_path: str):
    input_file = Path(input_path)
    output_file = Path(output_path)

    if not input_file.exists():
        raise FileNotFoundError(f"Input file does not exist: {input_file}")

    text = input_file.read_text(encoding="utf-8")

    text = text.replace("-", " ")
    text = text.replace("—", " ")

    # replace ordinal numbers (1st, 2nd, 3rd, 14th, etc.) with spelled-out versions
    def replace_ordinal(match):
        number = int(match.group(1))
        return num2words(number, ordinal=True)
    
    #text = re.sub(r'\b(\d+)(?:st|nd|rd|th)\b', replace_ordinal, text, flags=re.IGNORECASE)

    # replace regular numbers with spelled-out versions
    def replace_number(match):
        number = int(match.group())
        return num2words(number)
    
    #text = re.sub(r'\b\d+\b', replace_number, text)

    # remove ALL non-alphanumeric characters
    clean_text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    cleaned_lines = "\n".join(clean_text.split())

    output_file.write_text(cleaned_lines, encoding="utf-8")


if __name__ == "__main__":
    song_folder = "samples/lucy"
    
    clean_lyrics_file(f"{song_folder}/lyrics.txt", f"{song_folder}/lyrics-clean.txt")