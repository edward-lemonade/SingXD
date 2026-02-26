"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Timing } from "@/src/lib/types/types";

interface SyncMapLyricsEditorProps {
	lyricsString: string;
	onChange: (lyrics: string) => void;
	timings: Timing[];
	onWordTimingClick?: (timing: Timing, wordFlatIndex: number) => void;
	placeholder?: string;
	className?: string;
}

type Token = { kind: "word"; text: string } | { kind: "newline" };

function parseTokens(raw: string): Token[] {
	const tokens: Token[] = [];
	raw.split("\n").forEach((line, li, arr) => {
		line
			.replaceAll("-", "- ")
			.replaceAll("—", "- ")
			.split(" ")
			.filter(Boolean)
			.forEach((w) => tokens.push({ kind: "word", text: w }));
		if (li < arr.length - 1) tokens.push({ kind: "newline" });
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
			out += (out === "" || out.endsWith("\n") ? "" : " ") + text;
		}
	});
	return out;
}

function positionFromPoint(
	x: number,
	y: number,
	brickRects: Array<{ tokenIdx: number; rect: DOMRect }>,
	lineDivs: HTMLElement[]
): number {
	let bestLineIdx = 0;
	let bestLineDist = Infinity;
	lineDivs.forEach((div, li) => {
		const r = div.getBoundingClientRect();
		const yClamped = Math.max(r.top, Math.min(r.bottom, y));
		const dist = Math.abs(yClamped - y);
		if (dist < bestLineDist) { bestLineDist = dist; bestLineIdx = li; }
	});

	const lineDiv = lineDivs[bestLineIdx];
	if (!lineDiv) return 0;

	const bricksOnLine = brickRects.filter(({ rect }) => {
		const lineDivRect = lineDiv.getBoundingClientRect();
		return rect.top >= lineDivRect.top - 4 && rect.bottom <= lineDivRect.bottom + 4;
	});

	if (bricksOnLine.length === 0) {
		const lineEnd = lineDiv.dataset.lineEnd;
		return lineEnd !== undefined ? parseInt(lineEnd) : 0;
	}

	let best = bricksOnLine[0];
	let bestDist = Infinity;
	for (const b of bricksOnLine) {
		const cx = (b.rect.left + b.rect.right) / 2;
		const dist = Math.abs(cx - x);
		if (dist < bestDist) { bestDist = dist; best = b; }
	}

	const cx = (best.rect.left + best.rect.right) / 2;
	return x >= cx ? best.tokenIdx + 1 : best.tokenIdx;
}

export default function SyncMapLyricsEditor({
	lyricsString,
	onChange,
	timings,
	onWordTimingClick,
	placeholder = "Paste or type lyrics here…",
	className = "",
}: SyncMapLyricsEditorProps) {
	const containerRef  = useRef<HTMLDivElement>(null);
	const contentRef    = useRef<HTMLDivElement>(null);

	const tokensRef     = useRef<Token[]>(parseTokens(lyricsString));
	const cursorRef     = useRef<number>(tokensRef.current.length);
	const anchorRef     = useRef<number | null>(null);
	const draftElRef    = useRef<HTMLSpanElement | null>(null);
	const onChangeRef   = useRef(onChange);
	const timingsRef    = useRef(timings);
	const onWordClickRef = useRef(onWordTimingClick);

	const brickRectsRef = useRef<Array<{ tokenIdx: number; rect: DOMRect }>>([]);
	const lineDivsRef   = useRef<HTMLElement[]>([]);
	const isDraggingRef = useRef(false);

	useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
	useEffect(() => { onWordClickRef.current = onWordTimingClick; }, [onWordTimingClick]);
	useEffect(() => { timingsRef.current = timings; renderDOM(); }, [timings]);

	useEffect(() => {
		const current = serializeTokens(tokensRef.current);
		if (current !== lyricsString) {
			tokensRef.current = parseTokens(lyricsString);
			cursorRef.current = tokensRef.current.length;
			anchorRef.current = null;
			renderDOM();
		}
	}, [lyricsString]);

	function selStart() {
		const a = anchorRef.current, c = cursorRef.current;
		return a === null ? c : Math.min(a, c);
	}
	function selEnd() {
		const a = anchorRef.current, c = cursorRef.current;
		return a === null ? c : Math.max(a, c);
	}
	function hasSel() {
		return anchorRef.current !== null && anchorRef.current !== cursorRef.current;
	}
	function clampCursor() {
		cursorRef.current = Math.min(cursorRef.current, tokensRef.current.length);
	}

	function deleteSelection() {
		const ss = selStart(), se = selEnd();
		tokensRef.current.splice(ss, se - ss);
		cursorRef.current = ss;
		anchorRef.current = null;
	}

	function emitChange() {
		onChangeRef.current(serializeTokens(tokensRef.current));
	}

	function commitDraft(appendNewline = false) {
		const raw = draftElRef.current?.textContent ?? "";
		const words = raw.split(/[ \t]+/).filter(Boolean);
		if (words.length === 0 && !appendNewline) return;

		clampCursor();
		if (hasSel()) deleteSelection();
		const insertAt = cursorRef.current;

		const newToks: Token[] = words.map((w) => ({ kind: "word", text: w }));
		if (appendNewline) newToks.push({ kind: "newline" });
		tokensRef.current.splice(insertAt, 0, ...newToks);
		if (draftElRef.current) draftElRef.current.textContent = "";
		cursorRef.current = insertAt + newToks.length;
		anchorRef.current = null;
		emitChange();
		renderDOM();
	}

	function focusDraft() {
		const draft = draftElRef.current;
		if (!draft) return;
		draft.focus();
		const range = document.createRange();
		range.selectNodeContents(draft);
		range.collapse(false);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}

	function renderDOM() {
		const content = contentRef.current;
		if (!content) return;

		clampCursor();
		const tokens = tokensRef.current;
		const cp = cursorRef.current;
		const ss = selStart(), se = selEnd(), sel = hasSel();
		const currentTimings = timingsRef.current;

		const draftWasFocused = document.activeElement === draftElRef.current;
		const draftText = draftElRef.current?.textContent ?? "";

		type Item =
			| { type: "brick"; idx: number; text: string; wi: number }
			| { type: "newline" }
			| { type: "draft" };

		const items: Item[] = [];
		let wc = 0;
		tokens.forEach((t, i) => {
			if (i === cp) items.push({ type: "draft" });
			if (t.kind === "newline") items.push({ type: "newline" });
			else items.push({ type: "brick", idx: i, text: t.text, wi: wc++ });
		});
		if (cp >= tokens.length) items.push({ type: "draft" });

		type Line = { items: Item[]; lineEndTokenIdx: number };
		const lines: Line[] = [{ items: [], lineEndTokenIdx: 0 }];
		let lastTokenIdx = -1;
		items.forEach((item) => {
			if (item.type === "newline") {
				lines[lines.length - 1].lineEndTokenIdx = lastTokenIdx + 1;
				lines.push({ items: [], lineEndTokenIdx: lastTokenIdx + 1 });
			} else {
				if (item.type === "brick") lastTokenIdx = item.idx;
				lines[lines.length - 1].items.push(item);
			}
		});
		lines[lines.length - 1].lineEndTokenIdx = Math.max(lastTokenIdx + 1, cp);

		content.innerHTML = "";
		draftElRef.current = null;
		brickRectsRef.current = [];
		lineDivsRef.current = [];

		lines.forEach((line, li) => {
			const lineDiv = document.createElement("div");
			lineDiv.className = "flex flex-wrap items-center gap-0 min-h-8";
			lineDiv.dataset.lineIndex = String(li);
			lineDiv.dataset.lineEnd = String(line.lineEndTokenIdx);

			line.items.forEach((item) => {
				if (item.type === "draft") {
					const span = document.createElement("span");
					span.contentEditable = "true";
					span.spellcheck = false;
					span.dataset.draft = "1";
					span.textContent = draftText;
					span.className = [
						"inline-block min-w-[4px] outline-none",
						"px-1 py-0.5 mx-0.5 my-0.5 text-sm text-gray-800",
						"border-b-2 border-transparent",
						"transition-colors duration-100 whitespace-pre",
					].join(" ");
					span.addEventListener("keydown", handleKeyDown);
					span.addEventListener("paste", handlePaste);
					span.addEventListener("focus", () => { span.style.borderBottomColor = "#a855f7"; });
					span.addEventListener("blur",   () => { span.style.borderBottomColor = "transparent"; });
					lineDiv.appendChild(span);
					draftElRef.current = span;
				} else if (item.type === "brick") {
					const timing = currentTimings[item.wi];
					const isSelected = sel && item.idx >= ss && item.idx < se;

					const span = document.createElement("span");
					span.dataset.tokenIdx = String(item.idx);
					span.className = [
						"inline-flex items-center",
						"px-2 py-0.5 mx-0.5 my-0.5 rounded border text-sm font-medium select-none",
						"transition-colors duration-100 cursor-text",
						isSelected
							? "bg-blue-200 border-blue-400 text-blue-900"
							: timing
							? "bg-purple-100 border-purple-300 text-purple-900"
							: "bg-gray-100 border-gray-300 text-gray-700",
					].join(" ");
					span.textContent = item.text;
					if (timing) span.title = `${timing.start.toFixed(2)}s – ${timing.end.toFixed(2)}s`;

					lineDiv.appendChild(span);
				}
			});

			content.appendChild(lineDiv);
			lineDivsRef.current.push(lineDiv);
		});

		requestAnimationFrame(() => {
			brickRectsRef.current = [];
			lineDivsRef.current.forEach((lineDiv) => {
				lineDiv.querySelectorAll<HTMLElement>("[data-token-idx]").forEach((el) => {
					brickRectsRef.current.push({
						tokenIdx: parseInt(el.dataset.tokenIdx!),
						rect: el.getBoundingClientRect(),
					});
				});
			});
		});

		if (draftWasFocused && draftElRef.current) {
			(draftElRef.current as HTMLSpanElement).focus();
			const range = document.createRange();
			range.selectNodeContents(draftElRef.current);
			range.collapse(false);
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		const draftEmpty = !draftElRef.current?.textContent;
		const isMac = navigator.platform.toUpperCase().includes("MAC");
		const ctrl = isMac ? e.metaKey : e.ctrlKey;
		clampCursor();
		const cp = cursorRef.current;

		if (ctrl && e.key === "a") {
			e.preventDefault();
			anchorRef.current = 0;
			cursorRef.current = tokensRef.current.length;
			renderDOM();
			return;
		}
		if (e.key === " ") { e.preventDefault(); commitDraft(); return; }
		if (e.key === "Enter") { e.preventDefault(); commitDraft(true); return; }

		if (e.key === "Backspace" && draftEmpty) {
			e.preventDefault();
			if (hasSel()) { deleteSelection(); }
			else {
				if (cp === 0) return;
				const removed = tokensRef.current[cp - 1];
				tokensRef.current.splice(cp - 1, 1);
				cursorRef.current = cp - 1;
				anchorRef.current = null;
				if (removed.kind === "word" && draftElRef.current)
					draftElRef.current.textContent = removed.text;
			}
			emitChange(); renderDOM(); return;
		}

		if (e.key === "Delete" && draftEmpty) {
			e.preventDefault();
			if (hasSel()) { deleteSelection(); }
			else {
				if (cp >= tokensRef.current.length) return;
				tokensRef.current.splice(cp, 1);
				anchorRef.current = null;
			}
			emitChange(); renderDOM(); return;
		}

		if (e.key === "ArrowLeft" && draftEmpty) {
			e.preventDefault();
			if (e.shiftKey) {
				if (anchorRef.current === null) anchorRef.current = cp;
				cursorRef.current = Math.max(0, cursorRef.current - 1);
			} else {
				cursorRef.current = hasSel() ? selStart() : Math.max(0, cp - 1);
				anchorRef.current = null;
			}
			renderDOM(); return;
		}

		if (e.key === "ArrowRight" && draftEmpty) {
			e.preventDefault();
			if (e.shiftKey) {
				if (anchorRef.current === null) anchorRef.current = cp;
				cursorRef.current = Math.min(tokensRef.current.length, cursorRef.current + 1);
			} else {
				cursorRef.current = hasSel() ? selEnd() : Math.min(tokensRef.current.length, cp + 1);
				anchorRef.current = null;
			}
			renderDOM(); return;
		}

		if (hasSel() && e.key.length === 1 && !ctrl) {
			deleteSelection();
			emitChange();
			renderDOM();
		}
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const text = e.clipboardData?.getData("text/plain");
		if (!text) return;
		clampCursor();
		if (hasSel()) deleteSelection();
		const insertAt = cursorRef.current;
		const before = serializeTokens(tokensRef.current.slice(0, insertAt));
		const after = serializeTokens(tokensRef.current.slice(insertAt));
		const joined = [before, text, after].filter(Boolean).join(" ");
		onChangeRef.current(joined);
	}

	function handleBrickClick(tokenIdx: number, timing: Timing | undefined, e: MouseEvent) {
		if (isDraggingRef.current) return;

		clampCursor();
		const cp = cursorRef.current;

		let fi = 0;
		for (let i = 0; i < tokenIdx; i++) {
			if (tokensRef.current[i].kind === "word") fi++;
		}

		const newCursor = tokenIdx + 1;

		if (e.shiftKey) {
			if (anchorRef.current === null) anchorRef.current = cp;
			cursorRef.current = newCursor;
		} else {
			const raw = draftElRef.current?.textContent?.trim() ?? "";
			if (raw) {
				const newWords: Token[] = raw.split(/[ \t]+/).filter(Boolean)
					.map((w) => ({ kind: "word", text: w }));
				tokensRef.current.splice(cp, 0, ...newWords);
				if (draftElRef.current) draftElRef.current.textContent = "";
				const shift = cp <= tokenIdx ? newWords.length : 0;
				cursorRef.current = tokenIdx + shift + 1;
				emitChange();
			} else {
				cursorRef.current = newCursor;
			}
			anchorRef.current = null;

			if (timing && onWordClickRef.current) {
				onWordClickRef.current(timing, fi);
			}
		}

		renderDOM();
		setTimeout(focusDraft, 0);
	}

	const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		const target = e.target as HTMLElement;
		if (target.closest("[data-draft]")) return;

		e.preventDefault();

		brickRectsRef.current = [];
		lineDivsRef.current.forEach((lineDiv) => {
			lineDiv.querySelectorAll<HTMLElement>("[data-token-idx]").forEach((el) => {
				brickRectsRef.current.push({
					tokenIdx: parseInt(el.dataset.tokenIdx!),
					rect: el.getBoundingClientRect(),
				});
			});
		});

		const clickedBrick = target.closest<HTMLElement>("[data-token-idx]");
		const startPos = clickedBrick
			? parseInt(clickedBrick.dataset.tokenIdx!) + 1
			: positionFromPoint(e.clientX, e.clientY, brickRectsRef.current, lineDivsRef.current);

		if (e.shiftKey) {
			clampCursor();
			if (anchorRef.current === null) anchorRef.current = cursorRef.current;
			cursorRef.current = startPos;
		} else {
			anchorRef.current = startPos;
			cursorRef.current = startPos;
		}

		isDraggingRef.current = false;
		const mouseDownX = e.clientX;
		const mouseDownY = e.clientY;
		renderDOM();
		focusDraft();

		const onMouseMove = (me: globalThis.MouseEvent) => {
			const dx = me.clientX - mouseDownX;
			const dy = me.clientY - mouseDownY;
			if (!isDraggingRef.current && Math.sqrt(dx * dx + dy * dy) < 5) return;

			isDraggingRef.current = true;
			const newPos = positionFromPoint(
				me.clientX, me.clientY,
				brickRectsRef.current,
				lineDivsRef.current
			);
			if (newPos !== cursorRef.current) {
				cursorRef.current = newPos;
				renderDOM();
				if (draftElRef.current && document.activeElement !== draftElRef.current) {
					draftElRef.current.focus();
				}
			}
		};

		const onMouseUp = (me: globalThis.MouseEvent) => {
			window.removeEventListener("mousemove", onMouseMove);
			window.removeEventListener("mouseup", onMouseUp);

			if (!me.shiftKey) {
				if (!isDraggingRef.current) {
					anchorRef.current = null;
					cursorRef.current = startPos;
				} else if (anchorRef.current === cursorRef.current) {
					anchorRef.current = null;
				}
			}

			// Fire brick click callback if this was a plain click on a brick
			if (!isDraggingRef.current && !me.shiftKey && clickedBrick) {
				const tokenIdx = parseInt(clickedBrick.dataset.tokenIdx!);
				const wi = brickRectsRef.current.find(b => b.tokenIdx === tokenIdx);
				if (wi !== undefined) {
					const timing = timingsRef.current[
						tokensRef.current.slice(0, tokenIdx).filter(t => t.kind === "word").length
					];
					handleBrickClick(tokenIdx, timing, me);
					return;
				}
			}

			isDraggingRef.current = false;
			renderDOM();
			focusDraft();
		};

		window.addEventListener("mousemove", onMouseMove);
		window.addEventListener("mouseup", onMouseUp);
	}, []);

	useEffect(() => {
		renderDOM();
		draftElRef.current?.focus();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div
			ref={containerRef}
			onMouseDown={handleMouseDown}
			className={[
				"relative min-h-32 w-full rounded-md border-2 border-gray-200 p-3",
				"cursor-text transition-colors duration-150 select-none",
				"focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100",
				className,
			].join(" ")}
		>
			{tokensRef.current.length === 0 && (
				<span
					className="pointer-events-none absolute left-3 top-3 text-sm text-gray-400 select-none"
					aria-hidden
				>
					{placeholder}
				</span>
			)}
			<div ref={contentRef} className="flex flex-col gap-1" />
		</div>
	);
}