import { expect, it } from 'vitest';
import { characterStats, updateCharacterStat } from '../../src/UI/Game/CharacterStats.js';
it('keeps server base/bonus fields and ASPD conversion, updates live and isolates new characters', () => {
 const entity = {}; const value = key => characterStats(entity).find(s => s.key === key).value;
 expect(value('def')).toBe('—'); updateCharacterStat(entity, 'def', 8); updateCharacterStat(entity, 'def2', 35); expect(value('def')).toBe('8 + 35');
 updateCharacterStat(entity, 'def', 2); expect(value('def')).toBe('2 + 35');
 updateCharacterStat(entity, 'str', 20); updateCharacterStat(entity, 'str2', -2); expect(value('str')).toBe('20 − 2');
 updateCharacterStat(entity, 'aspd', 321); expect(value('aspd')).toBe(167);
 expect(characterStats({}).find(s => s.key === 'str').value).toBe('—'); updateCharacterStat(null, 'str', 10);
});
