// Combat owns scheduling while enabled; pickup runs independently otherwise.
// A pickup turn retains control until its fixed batch ends or reaches its time limit.
const combats = new Set();
let pickup = null;
export function registerAutomationCombat(controller) {
	combats.add(controller);
	return () => combats.delete(controller);
}
export function hasAutomationCombat() {
	return [...combats].some(controller => controller.snapshot().active);
}
export function registerAutomationPickup(controller) {
	pickup = controller;
	return () => {
		if (pickup === controller) pickup = null;
	};
}
export function takeAutomationPickupTurn() {
	return pickup?.takeTurn() || false;
}
export function cancelAutomationPickup() {
	pickup?.cancel();
}
