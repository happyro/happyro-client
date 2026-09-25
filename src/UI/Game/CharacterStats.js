/** Server status values, scoped to the current character entity rather than a desktop window. */
const values = new WeakMap();
const results = new WeakMap();
export function characterStatValues(entity) {
	return { ...values.get(entity) };
}
export function recordCharacterStatResult(entity, type, success) {
	if (!entity) return;
	if (!results.has(entity)) results.set(entity, new Map());
	results.get(entity).set(type, { success: Boolean(success) });
}
export function characterStatResult(entity, type) {
	return results.get(entity)?.get(type);
}
export function updateCharacterStat(entity, type, value) {
	if (!entity) return;
	if (!values.has(entity)) values.set(entity, {});
	values.get(entity)[type] = value;
}
export function characterStats(entity) {
	const state = values.get(entity) || {};
	const pair = (key, bonus = key + '2') =>
		state[key] === undefined
			? '—'
			: `${state[key]}${state[bonus] ? ` ${state[bonus] < 0 ? '−' : '+'} ${Math.abs(state[bonus])}` : ''}`;
	return [
		...[
			['str', '力量'],
			['agi', '敏捷'],
			['vit', '体力'],
			['int', '智力'],
			['dex', '灵巧'],
			['luk', '幸运'],
			['atak', '物理攻击'],
			['matak', '魔法攻击'],
			['def', '物理防御'],
			['mdef', '魔法防御'],
			['flee', '回避']
		].map(([key, label]) => ({ key, label, value: pair(key) })),
		...[
			['hit', '命中'],
			['critical', '暴击']
		].map(([key, label]) => ({ key, label, value: state[key] ?? '—' })),
		{ key: 'aspd', label: '攻击速度', value: state.aspd === undefined ? '—' : Math.floor(200 - state.aspd / 10) }
	];
}
