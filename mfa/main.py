# clean_lyrics.py

import sys

def clean_line(line):
    line = line.lower().strip()

    allowed = set("'")
    cleaned = []
    for char in line:
        if char.isalnum() or char.isspace() or char in allowed:
            cleaned.append(char)
        else:
            cleaned.append(' ')

    cleaned_line = ''.join(cleaned)
    cleaned_line = ' '.join(cleaned_line.split())
    return cleaned_line

def clean_lyrics_file(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    cleaned_lines = [clean_line(line) for line in lines if line.strip() != '']

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\t'.join(cleaned_lines))
    
    print(f"Cleaned lyrics saved to: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python clean_lyrics.py <input_file.txt> <output_file.txt>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    clean_lyrics_file(input_file, output_file)
