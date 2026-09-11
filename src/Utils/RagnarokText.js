function markupTag() {
	return /<(ITEMLINK|ITEM|NAVI)>([\s\S]*?)<INFO>([\s\S]*?)<\/INFO><\/\1>/gi;
}

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function applyColorCodes(text) {
	let hasOpenSpan = false;
	const html = String(text ?? '').replace(/\^([0-9a-fA-F]{6})/g, (_, color) => {
		const close = hasOpenSpan ? '</span>' : '';
		hasOpenSpan = true;
		return `${close}<span style="color:#${color}">`;
	});
	return hasOpenSpan ? `${html}</span>` : html;
}

function markupSource(value) {
	if (Array.isArray(value)) {
		return value.filter(Boolean).join('\n');
	}
	return typeof value === 'string' ? value : '';
}

export function toPlainRagnarokText(value) {
	return markupSource(value)
		.replace(markupTag(), '$2')
		.replace(/\^[0-9a-f]{6}/gi, '')
		.replace(/(?:\\n|\^n)/gi, '\n');
}

export function formatRagnarokMarkup(value) {
	const text = markupSource(value).replace(/(?:\\n|\^n)/gi, '\n');
	const parts = [];
	let lastIndex = 0;
	for (const match of text.matchAll(markupTag())) {
		parts.push(applyColorCodes(escapeHtml(text.slice(lastIndex, match.index))));
		const [, tag, label, info] = match;
		const inner = applyColorCodes(escapeHtml(label));
		if (tag.toUpperCase() === 'NAVI') {
			parts.push(
				`<span class="navi-link" data-navi-info="${escapeHtml(info)}" data-navi-name="${escapeHtml(toPlainRagnarokText(label))}">${inner}</span>`
			);
		} else {
			parts.push(`<span class="item-link" data-item-id="${escapeHtml(info)}">${inner}</span>`);
		}
		lastIndex = match.index + match[0].length;
	}
	parts.push(applyColorCodes(escapeHtml(text.slice(lastIndex))));
	return parts.join('');
}
