function intersectsWithGap(rect, other, gap) {
	return (
		rect.left < other.right + gap &&
		rect.right + gap > other.left &&
		rect.top < other.bottom + gap &&
		rect.bottom + gap > other.top
	);
}

export function chooseDungeonLabelOffset(rect, mapRect, placed, gap = 4) {
	const step = rect.height + gap;
	const offsets = [0, -step, step, -step * 2, step * 2];

	for (const offset of offsets) {
		const candidate = {
			left: rect.left,
			right: rect.right,
			top: rect.top + offset,
			bottom: rect.bottom + offset
		};
		const insideMap = candidate.top >= mapRect.top && candidate.bottom <= mapRect.bottom;
		if (insideMap && !placed.some(other => intersectsWithGap(candidate, other, gap))) return offset;
	}

	return 0;
}
