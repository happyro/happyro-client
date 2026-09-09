export function toPlainRagnarokText(value) {
	return typeof value === 'string' ? value.replace(/\^[0-9a-f]{6}/gi, '').replace(/(?:\\n|\^n)/gi, '\n') : '';
}
