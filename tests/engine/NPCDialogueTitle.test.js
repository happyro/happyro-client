import { expect, it } from 'vitest';
import { npcDialogueTitle } from '../../src/Engine/MapEngine/NPCDialogueTitle.js';

it('hides internal route identifiers only for portal NPCs', () => {
 expect(npcDialogueTitle({_job:45,display:{name:'aldeg-1_aldeg-1-1#6_te'}})).toBe('传送入口');
 expect(npcDialogueTitle({_job:112,display:{name:'卡普拉员工#城堡'}})).toBe('卡普拉员工');
 expect(npcDialogueTitle({_job:112,display:{name:'LF-01#schg_cas01'}})).toBe('LF-01');
 expect(npcDialogueTitle(undefined)).toBe('对话');
});

it('uses a readable fallback for unnamed castle switches without hiding proper names', () => {
 expect(npcDialogueTitle({_job:111,display:{name:' #sch01_switch'}})).toBe('对话');
 expect(npcDialogueTitle({_job:111,display:{name:'#hidden_trigger'}})).toBe('对话');
 expect(npcDialogueTitle({_job:111})).toBe('对话');
 expect(npcDialogueTitle({_job:111,display:{name:'Valkyrie#quest'}})).toBe('Valkyrie');
});
