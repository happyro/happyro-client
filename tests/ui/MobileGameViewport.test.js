import { afterEach, expect, it, vi } from 'vitest';
import { createMobileViewport } from '../../src/UI/Mobile/game/MobileViewport.js';
afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren(); });
it('preserves layout height during keyboard input, follows its offset and restores on dismissal', () => {
 const host=document.createElement('div'); const root=host.attachShadow({mode:'open'});
 root.innerHTML='<input>'; document.body.append(host);
 vi.stubGlobal('innerWidth',844); vi.stubGlobal('innerHeight',390);
 const visual={width:844,height:390,offsetTop:0};vi.stubGlobal('visualViewport',visual);
 const update=createMobileViewport(host);update();root.querySelector('input').focus();
 visual.height=170;visual.offsetTop=20;update();
 expect(host.style.height).toBe('170px');expect(host.style.top).toBe('20px');
 expect(host.style.getPropertyValue('--mobile-layout-height')).toBe('390px');expect(host.classList.contains('keyboard-open')).toBe(true);
 visual.height=390;visual.offsetTop=0;update();expect(host.classList.contains('keyboard-open')).toBe(false);
});
it('accepts an actual orientation width change instead of retaining the old height', () => {
 const host=document.createElement('div');const root=host.attachShadow({mode:'open'});root.innerHTML='<input>';document.body.append(host);
 vi.stubGlobal('innerWidth',844);vi.stubGlobal('innerHeight',390);const update=createMobileViewport(host);update();root.querySelector('input').focus();
 vi.stubGlobal('innerWidth',390);vi.stubGlobal('innerHeight',844);update();
 expect(host.style.width).toBe('390px');expect(host.style.getPropertyValue('--mobile-layout-height')).toBe('844px');
});
