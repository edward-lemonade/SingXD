"use client";

import React, {
	useRef,
	useCallback,
	useEffect,
	useState,
	KeyboardEvent,
	ClipboardEvent,
	MouseEvent,
} from "react";
import { Timing } from "@/src/lib/types/types";
import SyncMapLyricsEditorBrick from "@/src/components/SyncMapLyricsEditorBrick";

interface SyncMapLyricsEditorProps {
	lyricsString: string;
	onChange: (lyrics: string) => void;
	timings: Timing[];
	onWordTimingClick?: (timing: Timing, wordFlatIndex: number) => void;
	placeholder?: string;
	className?: string;
}

type WordToken = { kind: "word"; text: string };
type NewlineToken = { kind: "newline" };
type Token = WordToken | NewlineToken;

function parseTokens(raw: string): Token[] {
	const tokens: Token[] = [];
	const rawLines = raw.split("\n");
	rawLines.forEach((line, li) => {
		const words = line
			.replaceAll("-", "- ")
			.replaceAll("—", "- ")
			.split(" ")
			.filter((w) => w !== "");
		words.forEach((w) => tokens.push({ kind: "word", text: w }));
		if (li < rawLines.length - 1) tokens.push({ kind: "newline" });
	});
	return tokens;
}

function serializeTokens(tokens: Token[]): string {
	let out = "";
	tokens.forEach((t) => {
		if (t.kind === "newline") {
			out += "\n";
		} else {
			const text = t.text.replaceAll("- ", "-").replaceAll("- ", "—");
			out += (out.length === 0 || out.endsWith("\n") ? "" : " ") + text;
		}
	});
	return out;
}


export default function SyncMapLyricsEditor({
	lyricsString,
	onChange,
	timings,
	onWordTimingClick,
	placeholder = "Paste or type lyrics here…",
	className = "",
}: SyncMapLyricsEditorProps) {
	const tokens = parseTokens(lyricsString);

	// cursorPos as STATE — changing it triggers a re-render so the draft span moves in the DOM
	const [cursorPos, setCursorPos] = useState<number>(tokens.length);
	const draftRef = useRef<HTMLSpanElement | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Always keep cursor in bounds
	const clampedCursor = Math.min(cursorPos, tokens.length);

	// Focus helpers
	const focusDraft = useCallback(() => {
		const draft = draftRef.current;
		if (!draft) return;
		draft.focus();
		const range = document.createRange();
		range.selectNodeContents(draft);
		range.collapse(false);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}, []);

	// After every render keep caret at end of draft if it's focused
	useEffect(() => {
		const draft = draftRef.current;
		if (!draft || document.activeElement !== draft) return;
		const range = document.createRange();
		range.selectNodeContents(draft);
		range.collapse(false);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	});

	// Draft text helpers
	const getDraftText = () => draftRef.current?.textContent ?? "";
	const clearDraft = () => { if (draftRef.current) draftRef.current.textContent = ""; };

	// Commit draft at current cursor position
	const commitDraft = useCallback(
		(appendNewline = false) => {
			const raw = getDraftText();
			const words = raw.split(/[ \t]+/).filter(Boolean);
			if (words.length === 0 && !appendNewline) return;

			const newWords: Token[] = words.map((w) => ({ kind: "word", text: w }));
			if (appendNewline) newWords.push({ kind: "newline" });

			const newTokens = [...tokens];
			newTokens.splice(clampedCursor, 0, ...newWords);
			clearDraft();
			setCursorPos(clampedCursor + newWords.length);
			onChange(serializeTokens(newTokens));
		},
		[tokens, clampedCursor, onChange]
	);

	// Delete before cursor
	const deleteBeforeCursor = useCallback(() => {
		if (clampedCursor === 0) return;
		const newTokens = [...tokens];
		const removed = newTokens[clampedCursor - 1];
		newTokens.splice(clampedCursor - 1, 1);
		if (removed.kind === "word" && draftRef.current) {
			draftRef.current.textContent = removed.text;
		}
		setCursorPos(clampedCursor - 1);
		onChange(serializeTokens(newTokens));
	}, [tokens, clampedCursor, onChange]);

	// Delete after cursor
	const deleteAfterCursor = useCallback(() => {
		if (clampedCursor >= tokens.length) return;
		const newTokens = [...tokens];
		newTokens.splice(clampedCursor, 1);
		onChange(serializeTokens(newTokens));
	}, [tokens, clampedCursor, onChange]);

	// Keyboard
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLSpanElement>) => {
			const draftEmpty = !getDraftText();

			if (e.key === " ") { e.preventDefault(); commitDraft(); return; }
			if (e.key === "Enter") { e.preventDefault(); commitDraft(true); return; }
			if (e.key === "Backspace" && draftEmpty) { e.preventDefault(); deleteBeforeCursor(); return; }
			if (e.key === "Delete" && draftEmpty) { e.preventDefault(); deleteAfterCursor(); return; }
			if (e.key === "ArrowLeft" && draftEmpty) {
				e.preventDefault();
				setCursorPos((p) => Math.max(0, p - 1));
				return;
			}
			if (e.key === "ArrowRight" && draftEmpty) {
				e.preventDefault();
				setCursorPos((p) => Math.min(tokens.length, p + 1));
				return;
			}
		},
		[commitDraft, deleteBeforeCursor, deleteAfterCursor, tokens.length]
	);

	// Paste
	const handlePaste = useCallback(
		(e: ClipboardEvent<HTMLSpanElement>) => {
			e.preventDefault();
			const text = e.clipboardData.getData("text/plain");
			if (!text) return;

			const pastedTokens: Token[] = [];
			text.split(/\r?\n/).forEach((lineText, i) => {
				if (i > 0) pastedTokens.push({ kind: "newline" });
				lineText.split(/[ \t]+/).filter(Boolean)
					.forEach((w) => pastedTokens.push({ kind: "word", text: w }));
			});

			const newTokens = [...tokens];
			newTokens.splice(clampedCursor, 0, ...pastedTokens);
			clearDraft();
			setCursorPos(clampedCursor + pastedTokens.length);
			onChange(serializeTokens(newTokens));
		},
		[tokens, clampedCursor, onChange]
	);

	// Brick click: move cursor to after that brick
	const handleBrickClick = useCallback(
		(tokenIdx: number, timing: Timing | undefined, e: MouseEvent) => {
			e.stopPropagation();

			// Commit any pending draft first
			const raw = getDraftText();
			if (raw.trim()) {
				const newWords: Token[] = raw.split(/[ \t]+/).filter(Boolean)
					.map((w) => ({ kind: "word", text: w }));
				const newTokens = [...tokens];
				newTokens.splice(clampedCursor, 0, ...newWords);
				clearDraft();
				const shift = clampedCursor <= tokenIdx ? newWords.length : 0;
				setCursorPos(tokenIdx + shift + 1);
				onChange(serializeTokens(newTokens));
			} else {
				setCursorPos(tokenIdx + 1);
			}

			if (timing && onWordTimingClick) {
				let fi = 0;
				for (let i = 0; i < tokenIdx; i++) {
					if (tokens[i].kind === "word") fi++;
				}
				onWordTimingClick(timing, fi);
			}

			setTimeout(focusDraft, 0);
		},
		[tokens, clampedCursor, onChange, onWordTimingClick, focusDraft]
	);

	// Container click: move cursor to end
	const handleContainerClick = useCallback(
		(e: MouseEvent<HTMLDivElement>) => {
			if ((e.target as HTMLElement).closest("[data-brick]")) return;
			if ((e.target as HTMLElement).closest("[data-draft]")) return;
			setCursorPos(tokens.length);
			setTimeout(focusDraft, 0);
		},
		[tokens.length, focusDraft]
	);

	// Build render items
	type RenderItem =
		| { type: "brick"; tokenIdx: number; word: string; flatWordIdx: number }
		| { type: "newline" }
		| { type: "draft" };

	const items: RenderItem[] = [];
	let wordCount = 0;
	tokens.forEach((token, i) => {
		if (i === clampedCursor) items.push({ type: "draft" });
		if (token.kind === "newline") {
			items.push({ type: "newline" });
		} else {
			items.push({ type: "brick", tokenIdx: i, word: token.text, flatWordIdx: wordCount });
			wordCount++;
		}
	});
	if (clampedCursor >= tokens.length) items.push({ type: "draft" });

	// Split into visual lines
	const visualLines: RenderItem[][] = [[]];
	items.forEach((item) => {
		if (item.type === "newline") visualLines.push([]);
		else visualLines[visualLines.length - 1].push(item);
	});

	const draftSpan = (
		<span
			ref={draftRef}
			contentEditable
			suppressContentEditableWarning
			onKeyDown={handleKeyDown}
			onPaste={handlePaste}
			spellCheck={false}
			data-draft
			className={[
				"inline-block min-w-[4px] outline-none",
				"px-1 py-0.5 mx-0.5 my-0.5 text-sm text-gray-800",
				"border-b-2 border-transparent focus:border-purple-400",
				"transition-colors duration-100 whitespace-pre",
			].join(" ")}
		/>
	);

	return (
		<div
			ref={containerRef}
			onClick={handleContainerClick}
			className={[
				"relative min-h-32 w-full rounded-md border-2 border-gray-200 p-3",
				"cursor-text focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100",
				"transition-colors duration-150",
				className,
			].join(" ")}
		>
			{tokens.length === 0 && (
				<span
					className="pointer-events-none absolute left-3 top-3 text-sm text-gray-400 select-none"
					aria-hidden
				>
					{placeholder}
				</span>
			)}

			<div className="flex flex-col gap-1">
				{visualLines.map((lineItems, li) => (
					<div key={li} className="flex flex-wrap items-center gap-0 min-h-8">
						{lineItems.map((item) => {
							if (item.type === "draft") {
								return <React.Fragment key="__draft">{draftSpan}</React.Fragment>;
							}
							if (item.type != "brick") {return;}
							const t = timings[item.flatWordIdx];
							return (
								<span
									key={`${item.tokenIdx}-${item.word}`}
									data-brick
									onClick={(e) => handleBrickClick(item.tokenIdx, t, e)}
									className="cursor-text"
								>
									<SyncMapLyricsEditorBrick
										word={item.word}
										timing={t}
										hasTiming={!!t}
										onClickTiming={undefined}
									/>
								</span>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}