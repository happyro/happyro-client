import {beforeEach,expect,it,vi} from 'vitest';
const s=vi.hoisted(()=>({session:{Playing:true,hasParty:false,hasGuild:false},send:vi.fn()}));
vi.mock('Engine/SessionStorage.js',()=>({default:s.session}));
vi.mock('UI/Components/ChatBox/ChatBox.js',()=>({default:{TYPE:{PRIVATE:4,PARTY:8,GUILD:16,CLAN:2048},FILTER:{PUBLIC_CHAT:1}}}));
import {createGameChat,chatChannel} from '../../src/UI/Game/GameChat.js';
import {createChatPanel} from '../../src/UI/Mobile/game/ChatPanel.js';
beforeEach(()=>{vi.clearAllMocks();s.session.Playing=true;s.session.hasParty=false;s.session.hasGuild=false;});
it('requires a recipient and channel membership, preserving literal text for the engine',()=>{
 const service=createGameChat(s.send,()=>true);service.send('hi','private','');service.send('hi','party');service.send('hi','guild');expect(s.send).not.toHaveBeenCalled();expect(service.send('$你好','private','朋友')).toBe('');expect(s.send).toHaveBeenCalledExactlyOnceWith('$你好','private','朋友');s.session.Playing=false;service.send('hi','public');expect(s.send).toHaveBeenCalledTimes(1);
 expect(chatChannel({colorType:4})).toBe('private');expect(chatChannel({filterType:1})).toBe('public');
});
it('filters messages as text and retains drafts after validation failure',()=>{
 const body=document.body.appendChild(document.createElement('div'));const panel=createChatPanel(body,()=> '尚未加入队伍');panel.update([{text:'公开',channel:'public'},{text:'<img onerror=alert(1)>',channel:'private'}]);body.querySelector('[data-chat-filter="private"]').click();expect(body.querySelector('.chat-log').textContent).not.toContain('公开');expect(body.querySelector('img')).toBeNull();const input=body.querySelector('[aria-label="聊天内容"]');input.value='草稿';body.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));expect(input.value).toBe('草稿');expect(document.querySelector('.ui-toast').textContent).toContain('尚未加入队伍');
});

it('sends native emotion IDs with validation and throttling', () => {
 const emotion = vi.fn(), clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
 const service = createGameChat(s.send, () => true, emotion);
 expect(service.emote('lv')).toBe('');
 expect(emotion).toHaveBeenCalledExactlyOnceWith(3);
 expect(service.emote('lv')).toContain('太快');
 clock.mockReturnValue(2000);
 expect(service.emote('invalid')).toContain('有效');
 s.session.Playing = false;
 expect(service.emote('lv')).toContain('当前不能');
 expect(emotion).toHaveBeenCalledTimes(1);
 clock.mockRestore();
});
it('sends an expression immediately, closes the panel and protects composing input', async () => {
 const body = document.body.appendChild(document.createElement('div')), send = vi.fn(() => '');
 const onSent = vi.fn();
 createChatPanel(body, send, '', async () => ({lv: 'data:image/png;base64,AA=='}), onSent);
 body.querySelector('[data-emotions]').click();
 expect(body.querySelector('.chat-emotions').hidden).toBe(false);
 await vi.waitFor(() => expect(body.querySelector('[aria-label=爱心] img')).not.toBeNull());
 body.querySelector('[aria-label="爱心"]').click();
 expect(onSent).toHaveBeenCalledOnce();
 expect(send).toHaveBeenCalledExactlyOnceWith('/lv', 'public', '');
 send.mockClear();
 expect(body.querySelector('.chat-emotions').hidden).toBe(true);
 const input = body.querySelector('[aria-label="聊天内容"]'); input.value = '你好';
 input.dispatchEvent(new Event('compositionstart'));
 body.querySelector('form').dispatchEvent(new Event('submit', {cancelable:true}));
 expect(send).not.toHaveBeenCalled();
 input.dispatchEvent(new Event('compositionend'));
 body.querySelector('form').dispatchEvent(new Event('submit', {cancelable:true}));
 expect(send).toHaveBeenCalledExactlyOnceWith('你好', 'public', '');
 expect(input.value).toBe('');
});

it('reports native resource failures and retries on reopening the picker', async () => {
 const body = document.body.appendChild(document.createElement('div'));
 const load = vi.fn().mockRejectedValueOnce(new Error('missing')).mockResolvedValue({lv:'data:image/png;base64,AA=='});
 createChatPanel(body, () => '', '', load);
 const toggle = body.querySelector('[data-emotions]'); toggle.click();
 await vi.waitFor(() => expect(body.querySelector('.chat-emotions').textContent).toContain('加载失败'));
 toggle.click(); toggle.click();
 await vi.waitFor(() => expect(body.querySelector('[aria-label=爱心] img')).not.toBeNull());
 expect(load).toHaveBeenCalledTimes(2);
});

it('recognizes only complete native expression commands when Send is pressed', () => {
 const emotion=vi.fn(),service=createGameChat(s.send,()=>true,emotion);
 expect(service.send('/lv','public')).toBe('');
 expect(emotion).toHaveBeenCalledExactlyOnceWith(3);
 expect(s.send).not.toHaveBeenCalled();
 expect(service.send('hello /lv','public')).toBe('');
 expect(s.send).toHaveBeenLastCalledWith('hello /lv','public','');
 service.send('/not-a-command','public');
 expect(emotion).toHaveBeenCalledTimes(1);
});

it('keeps the expression picker and text draft when sending fails', async () => {
 const body=document.body.appendChild(document.createElement('div')), closed=vi.fn();
 createChatPanel(body,()=> '发送太快', '',async()=>({lv:'data:image/png;base64,AA=='}),closed);
 body.querySelector('[aria-label=聊天内容]').value='草稿';
 body.querySelector('[data-emotions]').click();
 await vi.waitFor(()=>expect(body.querySelector('[aria-label=爱心]')).not.toBeNull());
 body.querySelector('[aria-label=爱心]').click();
 expect(closed).not.toHaveBeenCalled();
 expect(body.querySelector('.chat-emotions').hidden).toBe(false);
 expect(body.querySelector('[aria-label=聊天内容]').value).toBe('草稿');
});
