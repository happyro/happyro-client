import { afterEach, expect, it } from 'vitest';
import { trackTabView, clearTabDrafts } from '../../src/UI/Components/GameTools/TabViewState.js';
let state;
afterEach(() => { state?.destroy(); document.body.replaceChildren(); });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
it('preserves dirty fields during refresh, updates clean fields, and discards drafts on close', async () => {
	const container = document.createElement('div'); document.body.append(container);
	state = trackTabView(container);
	container.innerHTML = '<form><input type="number" name="rate" value="1"><input type="number" name="other" value="2"></form>';
	await tick();
	const input = container.querySelector('input');input.value='';input.dispatchEvent(new Event('input', {bubbles:true}));
	container.hidden = true;
	container.innerHTML = '<form><input type="number" name="rate" value="3"><input type="number" name="other" value="4"></form>';
	await tick(); container.hidden=false;state.restore();
	expect(container.querySelector('[name=rate]').value).toBe('');
	expect(container.querySelector('[name=other]').value).toBe('4');
	state.discardDrafts();
	expect(container.querySelector('[name=rate]').value).toBe('3');
});
it('clears only saved fields while retaining other drafts and scroll position', async () => {
	const container=document.createElement('div');document.body.append(container);state=trackTabView(container);
	container.innerHTML='<form><input type="number" name="str" value="1"><input type="number" name="base_level" value="2"></form><div class="list"></div>';
	await tick();
	for(const input of container.querySelectorAll('input')){input.value='8';input.dispatchEvent(new Event('input',{bubbles:true}));}
	const list=container.querySelector('.list');list.scrollTop=90;list.dispatchEvent(new Event('scroll'));
	clearTabDrafts(container,['str']);
	container.innerHTML='<form><input type="number" name="str" value="5"><input type="number" name="base_level" value="2"></form><div class="list"></div>';
	await tick();
	expect(container.querySelector('[name=str]').value).toBe('5');
	expect(container.querySelector('[name=base_level]').value).toBe('8');
	expect(container.querySelector('.list').scrollTop).toBe(90);
});
