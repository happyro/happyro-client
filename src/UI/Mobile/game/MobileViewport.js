/** Keep the layout stable while a software keyboard covers part of the screen. */
export function createMobileViewport(host) {
	let layoutHeight = window.innerHeight;
	let layoutWidth = window.innerWidth;
	return () => {
		const visual = window.visualViewport;
		const width = document.documentElement.clientWidth || window.innerWidth;
		const height = document.documentElement.clientHeight || window.innerHeight;
		const editing = host.shadowRoot?.activeElement?.matches('input, textarea, select');
		const rotated = Math.abs(width - layoutWidth) > 80;
		if (!editing || rotated) {
			layoutHeight = height;
			layoutWidth = width;
		}
		const visibleHeight = Math.min(visual?.height || height, height);
		const keyboard = editing && visibleHeight < layoutHeight - 80;
		Object.assign(host.style, {
			width: `${width}px`,
			height: `${visibleHeight}px`,
			left: '0px',
			top: `${visual?.offsetTop || 0}px`
		});
		host.style.setProperty('--mobile-layout-height', `${keyboard ? layoutHeight : visibleHeight}px`);
		host.classList.toggle('keyboard-open', Boolean(keyboard));
	};
}
