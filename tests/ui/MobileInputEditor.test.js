import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMobileInputEditor } from '../../src/UI/Mobile/game/MobileInputEditor.js';
let dispose;
beforeEach(() => {
 // jsdom does not implement the dialog top layer; real browsers are checked separately.
 vi.stubGlobal('HTMLDialogElement', HTMLDialogElement);
 HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
 HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { dispose?.(); document.body.replaceChildren(); vi.unstubAllGlobals(); });
function setup(markup = '<input placeholder="地图名称" value="波利">') {
 const host = document.createElement('div'); const root = host.attachShadow({mode:'open'});
 root.innerHTML = markup; document.body.append(host); dispose = createMobileInputEditor(host);
 const input = root.querySelector('input,textarea'); input.focus();
 const overlay = document.querySelector('[data-mobile-input-editor]');
 return {host, input, overlay, editor: overlay?.shadowRoot, field: overlay?.shadowRoot.querySelector('input,textarea')};
}
it('edits a draft, commits events once and leaves the original page intact', () => {
 const {host,input,editor,field} = setup(); const events=[];
 input.addEventListener('input',()=>events.push('input')); input.addEventListener('change',()=>events.push('change'));
 expect(host.inert).toBe(true); expect(editor.activeElement).toBe(field);
 field.value='普隆德拉'; expect(input.value).toBe('波利');
 editor.querySelector('[data-done]').click();
 expect(input.value).toBe('普隆德拉'); expect(events).toEqual(['input','change']);
 expect(host.inert).not.toBe(true); expect(document.querySelector('[data-mobile-input-editor]')).toBeNull();
 input.focus(); expect(document.querySelector('[data-mobile-input-editor]')).not.toBeNull();
});
it('cancels without changing the source and cleans up on unmount', () => {
 const {host,input,editor,field}=setup(); field.value='discard'; editor.querySelector('[data-cancel]').click();
 expect(input.value).toBe('波利'); input.focus(); dispose();
 expect(host.inert).not.toBe(true); expect(document.querySelector('[data-mobile-input-editor]')).toBeNull();
});
it('retains number validation and does not commit invalid values', () => {
 const {input,editor,field}=setup('<input type="number" min="1" max="10" value="2">');
 field.value='20'; editor.querySelector('[data-done]').click(); expect(input.value).toBe('2');
 expect(document.querySelector('[data-mobile-input-editor]')).not.toBeNull();
 field.value='5'; editor.querySelector('[data-done]').click(); expect(input.value).toBe('5');
});
it('does not submit when confirming Chinese composition and retains multiline Enter', () => {
 const {field}=setup(); field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));
 expect(document.querySelector('[data-mobile-input-editor]')).not.toBeNull();
 field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); expect(document.querySelector('[data-mobile-input-editor]')).toBeNull();
 dispose(); const second=setup('<textarea>hello</textarea>'); second.field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 expect(document.querySelector('[data-mobile-input-editor]')).not.toBeNull();
});
it('follows the visible viewport and removes viewport listeners on close', () => {
 const visual=new EventTarget(); Object.assign(visual,{height:390,offsetTop:0}); vi.stubGlobal('visualViewport',visual);
 const {editor}=setup(); visual.height=150; visual.offsetTop=20; visual.dispatchEvent(new Event('resize'));
 expect(editor.querySelector('section').style.height).toBe('150px'); expect(editor.querySelector('section').style.top).toBe('20px');
 editor.querySelector('[data-cancel]').click(); visual.height=390; visual.dispatchEvent(new Event('resize')); expect(editor.querySelector('section').style.height).toBe('150px');
});
it('leaves readonly fields alone', () => { expect(setup('<input readonly value="fixed">').overlay).toBeNull(); });

it('opens on pointerdown before the original field receives focus', () => {
 const host=document.createElement('div');const root=host.attachShadow({mode:'open'});
 root.innerHTML='<input>';document.body.append(host);dispose=createMobileInputEditor(host);
 const input=root.querySelector('input');const focused=vi.fn();input.addEventListener('focus',focused);
 const event=new MouseEvent('pointerdown',{bubbles:true,cancelable:true,button:0});input.dispatchEvent(event);
 expect(event.defaultPrevented).toBe(true);expect(focused).not.toHaveBeenCalled();
 const dialog=document.querySelector('[data-mobile-input-editor]').shadowRoot.querySelector('dialog');
 expect(dialog.open).toBe(true);
 const cancel=new Event('cancel',{cancelable:true});dialog.dispatchEvent(cancel);
 expect(cancel.defaultPrevented).toBe(true);expect(document.querySelector('[data-mobile-input-editor]')).toBeNull();
});
