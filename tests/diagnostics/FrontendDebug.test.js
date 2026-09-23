// @vitest-environment node
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, expect, it, vi } from 'vitest';
const source = readFileSync(new URL('../../applications/api/debug.js', import.meta.url), 'utf8');
let dom;
afterEach(() => dom?.window.close());
async function setup(enabled = true) {
 dom = new JSDOM('<meta name="happyro-build-id" content="test-build"><body></body>', { url: 'http://example.test/api.html?token=private' + (enabled ? '&debug=1' : ''), runScripts: 'outside-only' });
 const w = dom.window;
 w.localStorage.setItem('happyro.debug.enabled', '1');
 const instances = [];
 class Socket extends w.EventTarget {
  static CONNECTING = 0;
  constructor(url) { super(); this.url = url; this.readyState = 0; this.send = vi.fn(); instances.push(this); }
 }
 w.WebSocket = Socket;
 w.fetch = vi.fn(() => Promise.resolve({ status: 200 }));
 w.console.log = vi.fn();
 const originalFetch = w.fetch; const originalConsole = w.console.log;
 w.eval(source);
 await new Promise(resolve => w.addEventListener('load', resolve));
 return { w, instances, Socket, originalFetch, originalConsole, root: w.document.querySelector('#happyro-debug')?.shadowRoot };
}
it('stays hidden and leaves native APIs unchanged without debug=1, even with old saved state', async () => {
 const {w,root,Socket,originalFetch,originalConsole}=await setup(false);
 expect(root).toBeUndefined();
 expect(w.happyroDebug).toBeUndefined();
 expect(w.WebSocket).toBe(Socket);
 expect(w.fetch).toBe(originalFetch);
 expect(w.console.log).toBe(originalConsole);
});
it('debug=1 records startup immediately and supports pausing', async () => {
 const {w,root}=await setup(true);
 root.querySelector('.tab').click();
 expect(root.querySelector('textarea').value).toContain('debug.enabled');
 expect(root.querySelector('input').checked).toBe(true);
 root.querySelector('input').click();
 const before=w.happyroDebug.export(); w.console.log('not recorded');
 expect(w.happyroDebug.export()).toBe(before);
});
it('observes native sockets immediately without delays, payloads or URL credentials', async () => {
 const {w,instances}=await setup(true);
 const socket=new w.WebSocket('ws://user:password@example.test/ws?token=private');
 expect(instances).toHaveLength(1);
 expect(socket instanceof w.WebSocket).toBe(true);
 socket.readyState=1;socket.dispatchEvent(new w.Event('open'));
 socket.send('secret-packet');
 socket.dispatchEvent(new w.MessageEvent('message',{data:'secret-response'}));
 const log=w.happyroDebug.export();
 expect(log).toContain('ws.create');expect(log).toContain('ws.open');expect(log).toContain('ws.send');expect(log).toContain('ws.receive');
 for(const secret of ['secret-packet','secret-response','private','user:password']) expect(log).not.toContain(secret);
});
it('captures early errors, console and fetch metadata and redacts input values', async () => {
 const {w}=await setup(true);
 const input=w.document.createElement('input');input.type='password';input.value='my-private-password';w.document.body.append(input);input.dispatchEvent(new w.Event('input',{bubbles:true}));
 w.console.log('login my-private-password',{password:'object-secret'});
 w.dispatchEvent(new w.ErrorEvent('error',{message:'early failure my-private-password',filename:'http://example.test/app.js?token=private',lineno:7}));
 await w.fetch('/config?token=private');
 const log=w.happyroDebug.export();
 expect(log).toContain('javascript.error');expect(log).toContain('fetch.end');expect(log).toContain('[redacted]');
 for(const secret of ['my-private-password','object-secret','token=private']) expect(log).not.toContain(secret);
});
it('bounds logs and offers a manual copy fallback', async () => {
 const {w,root}=await setup(true);
 root.querySelector('.tab').click();
 for(let i=0;i<1100;i++)w.console.log('event '+i);
 expect(w.happyroDebug.export().split('\n')).toHaveLength(1000);
 root.querySelector('[data-copy]').click();
 await Promise.resolve();
 expect(root.querySelector('[role=status]').textContent).toContain('长按');
 const output = root.querySelector('textarea');
 const selected = output.value;
 w.console.log('new event while copying');
 await new Promise(resolve => setTimeout(resolve, 300));
 expect(output.value).toBe(selected);
 expect(output.selectionEnd).toBe(selected.length);
});
it('copies the entire log synchronously on HTTP without Clipboard API', async () => {
 const {w,root}=await setup(true);
 root.querySelector('.tab').click();
 const output=root.querySelector('textarea');
 let copied;
 w.document.execCommand=vi.fn(command=>{
  expect(command).toBe('copy');
  copied=output.value.slice(output.selectionStart,output.selectionEnd);
  return true;
 });
 root.querySelector('[data-copy]').click();
 expect(copied).toBe(w.happyroDebug.export());
 expect(root.querySelector('[role=status]').textContent).toContain('已复制全部日志');
});
it('uses selection copy if Clipboard API rejects permission', async () => {
 const {w,root}=await setup(true);
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:vi.fn().mockRejectedValue(new Error('denied'))}});
 w.document.execCommand=vi.fn(()=>true);
 root.querySelector('[data-copy]').click();
 await Promise.resolve();
 await vi.waitFor(() => expect(w.document.execCommand).toHaveBeenCalledWith('copy'));
 expect(root.querySelector('[role=status]').textContent).toContain('已复制全部日志');
});
