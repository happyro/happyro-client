import fixtures from './fixtures/guild-membership.json';
import { expect, it } from 'vitest';
import PACKET from '../../src/Network/PacketStructure.js';
import register from '../../src/Network/PacketRegister.js';
import BinaryReader from '../../src/Utils/BinaryReader.js';
it.each([[0xa83,PACKET.ZC.ACK_LEAVE_GUILD_DELNAME],[0xa82,PACKET.ZC.ACK_BAN_GUILD_DELNAME]])('routes and reads current guild event %s', (opcode,Type)=>{
 const bytes=new Uint8Array(opcode===0xa82?fixtures.expel:fixtures.leave);
 const reader=new BinaryReader(bytes.buffer);reader.readUShort();const p=new register[opcode](reader,bytes.length);
 expect(register[opcode]).toBe(Type);expect(Type.size).toBe(bytes.length);expect(p.GID).toBe(150114);expect(p.reasonDesc).toBe('audit reason');expect(reader.tell()).toBe(46);
});
it('reads guild expulsion history with char ID, reason and name',()=>{
 const bytes=new Uint8Array(fixtures.history);
 const reader=new BinaryReader(bytes.buffer);const p=new register[0xb7c](reader,68);
 expect(p.banList).toEqual([{GID:150114,reason:'audit reason',charname:'Member'}]);expect(reader.tell()).toBe(68);
});
