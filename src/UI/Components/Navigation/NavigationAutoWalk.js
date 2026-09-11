function nearestPathIndex(path, position) {
	if (!Array.isArray(path) || path.length === 0 || !position) return -1;
	let nearestIndex = 0;
	let nearestDistance = Infinity;
	for (let index = 0; index < path.length; index++) {
		const distance = Math.abs(path[index].x - position.x) + Math.abs(path[index].y - position.y);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = index;
		}
	}
	return nearestIndex;
}

export function remainingPathFromPosition(path, position) {
	const nearestIndex = nearestPathIndex(path, position);
	if (nearestIndex < 0) return Array.isArray(path) ? path : [];
	return path.slice(nearestIndex);
}

export function selectAutoWalkWaypoint(path, position, lookAhead = 12) {
	const nearestIndex = nearestPathIndex(path, position);
	if (nearestIndex < 0) return null;
	return path[Math.min(nearestIndex + lookAhead, path.length - 1)];
}
