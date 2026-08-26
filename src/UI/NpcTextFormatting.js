const FONT_SIZE_ATTRIBUTE = /\s+size\s*=\s*(?:"(\d+)"|'(\d+)'|(\d+))/i;

export function normalizeROFontSizes(text) {
	if (!text) return '';

	return String(text).replace(/<font\b([^>]*)>/gi, (tag, attributes) => {
		const sizeMatch = attributes.match(FONT_SIZE_ATTRIBUTE);
		if (!sizeMatch) return tag;

		const size = Number(sizeMatch[1] || sizeMatch[2] || sizeMatch[3]);
		const normalizedAttributes = attributes.replace(FONT_SIZE_ATTRIBUTE, '');
		return `<font${normalizedAttributes} style="font-size:${size}px">`;
	});
}
