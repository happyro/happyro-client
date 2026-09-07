export function normalizeMonsterSearch(value) {
	return String(value || '')
		.trim()
		.toLocaleLowerCase();
}

export function filterMonsters(monsters, search, category = 'all') {
	const term = normalizeMonsterSearch(search);
	return monsters.filter(monster => {
		if (category === 'boss' && !monster.boss) return false;
		if (category === 'normal' && monster.boss) return false;
		if (!term) return true;
		return [monster.id, monster.name, monster.nameEn, monster.aegisName].some(value =>
			String(value || '')
				.toLocaleLowerCase()
				.includes(term)
		);
	});
}

export function paginateMonsters(monsters, page, pageSize) {
	const pageCount = Math.max(1, Math.ceil(monsters.length / pageSize));
	const currentPage = Math.min(Math.max(1, page), pageCount);
	return {
		page: currentPage,
		pageCount,
		items: monsters.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	};
}
