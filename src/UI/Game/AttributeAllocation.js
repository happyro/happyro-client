/** Renewal costs match pc_need_status_point / pc_need_trait_point on the server. */
export function allocationCost(kind, value, amount) {
	let total = 0;
	for (let current = value; current < value + amount; current++)
		total +=
			kind === 'traits'
				? 1
				: current < 100
					? 2 + Math.floor((current - 1) / 10)
					: 16 + 4 * Math.floor((current - 100) / 5);
	return total;
}
