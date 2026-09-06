export function selectAutoWalkWaypoint(path, position, lookAhead = 12) {
	if (!Array.isArray(path) || path.length === 0) return null;

	let nearestIndex = 0;
	let nearestDistance = Infinity;
	for (let index = 0; index < path.length; index++) {
		const distance = Math.abs(path[index].x - position.x) + Math.abs(path[index].y - position.y);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = index;
		}
	}

	return path[Math.min(nearestIndex + lookAhead, path.length - 1)];
}
