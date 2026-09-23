export const smithingMaterials = [1000, 997, 996, 995, 994];
export function validateSmithingMaterials(ids, inventory) {
	if (!Array.isArray(ids) || ids.length > 3 || ids.some(id => !smithingMaterials.includes(id))) return false;
	if (ids.filter(id => id !== 1000).length > 1) return false;
	return [...new Set(ids)].every(
		id =>
			inventory.filter(item => item.ITID === id).reduce((sum, item) => sum + (item.count || 0), 0) >=
			ids.filter(value => value === id).length
	);
}
