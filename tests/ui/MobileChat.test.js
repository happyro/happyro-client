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
 const body=document.createElement('div');const panel=createChatPanel(body,()=> '尚未加入队伍');panel.update([{text:'公开',channel:'public'},{text:'<img onerror=alert(1)>',channel:'private'}]);const filter=body.querySelector('[aria-label="消息筛选"]');filter.value='private';filter.dispatchEvent(new Event('change'));expect(body.querySelector('.chat-log').textContent).not.toContain('公开');expect(body.querySelector('img')).toBeNull();const input=body.querySelector('[aria-label="聊天内容"]');input.value='草稿';body.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));expect(input.value).toBe('草稿');expect(body.textContent).toContain('尚未加入队伍');
});
