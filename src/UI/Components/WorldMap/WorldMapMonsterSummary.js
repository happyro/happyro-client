export function applyMonsterSummaries(mapView, summaries) {
	for (const section of mapView.querySelectorAll('.section')) {
		const summary = summaries.get(section.getAttribute('data-mapid'));
		if (!summary) continue;
		section.querySelector('.mapname').textContent = summary.name;
		section.setAttribute('data-monstername', summary.name);
	}
}
