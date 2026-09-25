vi.mock('UI/Components/Trade/Trade.js', () => ({default:{reqExchange:s.trade}}));
vi.mock('UI/UIManager.js', () => ({default:{showPromptBox:s.prompt}}));
import { beforeEach, expect, it, vi } from 'vitest';
const s = vi.hoisted(() => ({
	session: { Playing: true, Entity: null },
	trade: vi.fn(), prompt: vi.fn(),
	target: null,
	over: null,
	send: vi.fn(),
	walk: vi.fn(),
	stop: vi.fn(),
	free: vi.fn(),
	camera: { direction: 0 },
	mouse: { screen: {}, world: {} },
	types: { TYPE_MOB: 1, TYPE_PC: 2, TYPE_NPC: 3, TYPE_ITEM: 4, TYPE_NPC2: 5 }
}));
vi.mock('DB/DBManager.js', () => ({ default: {} }));
vi.mock('Engine/SessionStorage.js', () => ({ default: s.session }));
vi.mock('Renderer/EntityManager.js', () => ({
	default: {
		getFocusEntity: () => s.target,
		setOverEntity: vi.fn(),
		setFocusEntity: t => {
			s.target = t;
		},
		get: () => s.target,
		intersect: () => s.over
	}
}));
vi.mock('Renderer/Camera.js', () => ({ default: s.camera }));
vi.mock('Preferences/Camera.js', () => ({ DEFAULT_CAMERA_ZOOM: 110 }));
vi.mock('Renderer/Map/Altitude.js', () => ({
	default: {
		intersect: (a, b, out) => {
			out.push(20, 30);
			return true;
		}
	}
}));
vi.mock('Controls/MouseEventHandler.js', () => ({ default: s.mouse }));
vi.mock('Controls/MapControl.js', () => ({
	default: { onRequestWalk: s.walk, onRequestStopWalk: s.stop },
	checkFreeCell: s.free
}));
vi.mock('Network/NetworkManager.js', () => ({ default: { sendPacket: s.send } }));
vi.mock('Network/PacketStructure.js', () => ({
	default: {
		CZ: {
			CANCEL_LOCKON: class {},
			HAPPYRO_STOP_MOVE: class {},
			REQUEST_MOVE2: class {
				dest = [];
			}
		}
	}
}));
vi.mock('UI/Components/Navigation/Navigation.js', () => ({ default: { stopAutoWalk: vi.fn() } }));
import {
	tapScene,
	moveDirection,
	stopDirectionalMovement,
	attackSelected,
	stopAttack,
	interactSelected,
	targetSnapshot
} from '../../src/UI/Game/GameCommands.js';
function entity(type = 1) {
	return {
		constructor: s.types,
		objecttype: type,
		GID: 42,
		position: [2, 3],
		ACTION: { DIE: 99 },
		action: 0,
		display: { name: '目标' },
		onFocus: vi.fn(),
		onFocusEnd: vi.fn(),
		onMouseDown: vi.fn(),
		canAttackEntity: () => false
	};
}
beforeEach(() => {
	s.session.Playing = false;
	stopDirectionalMovement();
	s.session.Playing = true;
	vi.clearAllMocks();
	s.target = null;
	s.over = null;
	s.session.Entity = { position: [10, 10], ACTION: { DIE: 99, SIT: 2 }, action: 0 };
	s.session.moveAction = null;
	s.camera.direction = 0;
	s.free.mockImplementation((x, y, r, out) => {
		out.push(x, y);
		return true;
	});
});
it('selects without attacking, uses fresh tap coordinates, and preserves a target when tapping ground', () => {
	s.over = entity();
	tapScene(100, 200);
	expect(s.mouse.screen).toEqual({ x: 100, y: 200 });
	expect(s.over.onFocus).toHaveBeenCalledWith({ attack: false });
	expect(s.walk).not.toHaveBeenCalled();
	s.over = null;
	tapScene(120, 220);
	expect(s.walk).toHaveBeenCalledOnce();
	expect(s.stop).toHaveBeenCalledOnce();
	expect(s.target.GID).toBe(42);
});
it('does not auto acquire or attack friendly players or dead targets', () => {
	attackSelected();
	expect(s.send).not.toHaveBeenCalled();
	s.target = entity(2);
	attackSelected();
	expect(s.target.onFocus).not.toHaveBeenCalled();
	s.target = entity();
	s.target.action = 99;
	attackSelected();
	expect(s.target.onFocus).not.toHaveBeenCalled();
	s.target.action = 0;
	attackSelected(true);
	expect(s.target.onFocus).toHaveBeenCalledWith({ attack: true, allowMove: false });
	s.session.moveAction = { targetGID: 42 };
	stopAttack();
	expect(s.session.moveAction).toBeNull();
	expect(s.send).toHaveBeenCalledOnce();
});
it('rotates movement with the camera and respects blocked cells and sitting', () => {
	moveDirection(1, 0);
	expect(s.send.mock.calls.at(-1)[0].dest).toEqual([13, 10]);
	s.camera.direction = 2;
	moveDirection(1, 0);
	expect(s.send.mock.calls.at(-1)[0].dest).toEqual([10, 7]);
	s.free.mockReturnValue(false);
	moveDirection(1, 0);
	expect(s.send).toHaveBeenCalledTimes(2);
	s.session.Entity.action = 2;
	moveDirection(1, 0);
	expect(s.send).toHaveBeenCalledTimes(2);
});
it('exposes and dispatches only valid contextual interactions', () => {
	s.target = entity(3);
	expect(targetSnapshot().interaction).toBe('');
	interactSelected();
	expect(s.target.onMouseDown).toHaveBeenCalledOnce();
	s.target = entity(4);
	expect(targetSnapshot().interaction).toBe('');
	interactSelected();
	expect(s.mouse.world).toMatchObject({ x: 2, y: 3 });
	expect(s.target.onMouseDown).toHaveBeenCalledOnce();
	s.target = entity(1);
	interactSelected();
	expect(s.target.onMouseDown).not.toHaveBeenCalled();
});

it('requires explicit trade confirmation and rejects a target that changed during the prompt',()=>{
 s.target=entity(2);expect(targetSnapshot().interaction).toBe('交易');interactSelected();expect(s.trade).not.toHaveBeenCalled();const confirm=s.prompt.mock.calls[0][3];s.target=null;confirm();expect(s.trade).not.toHaveBeenCalled();s.target=entity(2);interactSelected();s.prompt.mock.calls[1][3]();expect(s.trade).toHaveBeenCalledExactlyOnceWith(42,'目标');
});

it('picks up a ground item on the initial tap using the item position without an extra button', () => {
 s.over = entity(s.types.TYPE_ITEM); tapScene(100, 200);
 expect(s.over.onMouseDown).toHaveBeenCalledOnce();
 expect(s.mouse.world).toEqual({ x: 2, y: 3 });
 expect(targetSnapshot().interaction).toBe('');
});


it.each([3, 5])('talks to NPC type %i on the first tap without an extra interaction button', type => {
 s.over = entity(type); tapScene(100, 200);
 expect(s.over.onMouseDown).toHaveBeenCalledOnce();
 expect(targetSnapshot().interaction).toBe('');
 expect(s.walk).not.toHaveBeenCalled();
});

import PACKET from '../../src/Network/PacketStructure.js';

it('sends exactly one stop on release even before the first movement acknowledgement', () => {
 moveDirection(1, 0);
 stopDirectionalMovement();
 expect(s.send).toHaveBeenCalledTimes(2);
 expect(s.send.mock.calls[1][0]).toBeInstanceOf(PACKET.CZ.HAPPYRO_STOP_MOVE);
 stopDirectionalMovement();
 expect(s.send).toHaveBeenCalledTimes(2);
 expect(s.session.moveAction).toBeNull();
});

it('does not send a stop for an idle drag start, a blocked direction or a ground tap', () => {
 stopDirectionalMovement();
 s.free.mockReturnValue(false);
 moveDirection(1, 0);
 stopDirectionalMovement();
 tapScene(100, 200);
 stopDirectionalMovement();
 expect(s.send).not.toHaveBeenCalled();
});

it.each(['disconnect', 'replacement', 'death', 'sitting'])('discards movement ownership on %s', reason => {
 moveDirection(1, 0);
 if (reason === 'disconnect') s.session.Playing = false;
 if (reason === 'replacement') s.session.Entity = { ...s.session.Entity };
 if (reason === 'death') s.session.Entity.action = s.session.Entity.ACTION.DIE;
 if (reason === 'sitting') s.session.Entity.action = s.session.Entity.ACTION.SIT;
 stopDirectionalMovement();
 expect(s.send).toHaveBeenCalledTimes(1);
 s.session.Playing = true;
 s.session.Entity.action = 0;
 stopDirectionalMovement();
 expect(s.send).toHaveBeenCalledTimes(1);
});

it('starts a fresh movement after release without retaining the previous stop', () => {
 moveDirection(1, 0);
 stopDirectionalMovement();
 moveDirection(0, 1);
 expect(s.send.mock.calls.at(-1)[0].dest).toEqual([10, 13]);
 stopDirectionalMovement();
 expect(s.send.mock.calls.filter(([packet]) => packet instanceof PACKET.CZ.HAPPYRO_STOP_MOVE)).toHaveLength(2);
});
