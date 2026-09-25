vi.mock('UI/Components/Trade/Trade.js', () => ({default:{reqExchange:s.trade}}));
vi.mock('UI/UIManager.js', () => ({default:{showPromptBox:s.prompt}}));
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
			REQUEST_MOVE2: class {
				dest = [];
			}
		}
	}
}));
vi.mock('UI/Components/Navigation/Navigation.js', () => ({ default: { stopAutoWalk: vi.fn() } }));
import {
	tapScene,
	createDirectionalMovement,
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
let movement;
const moveDirection = (...args) => movement.move(...args);
afterEach(() => vi.useRealTimers());
beforeEach(() => {
	vi.useFakeTimers();
	movement = createDirectionalMovement();
	s.session.ping = { value: 0 };
	s.send.mockReturnValue(true);
	vi.clearAllMocks();
	s.target = null;
	s.over = null;
	s.session.Entity = { position: [10, 10], walk: {speed: 150}, ACTION: { DIE: 99, SIT: 2 }, action: 0 };
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
	expect(s.send.mock.calls.at(-1)[0].dest).toEqual([12, 10]);
	s.camera.direction = 2;
	moveDirection(1, 0);
	expect(s.send.mock.calls.at(-1)[0].dest).toEqual([10, 8]);
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

it('extends the movement horizon for fast walking and network round trips', () => {
 s.session.Entity.walk.speed = 50;
 moveDirection(1,0);expect(s.send.mock.calls.at(-1)[0].dest).toEqual([14,10]);
 s.session.ping.value = 100;
 moveDirection(1,0);expect(s.send.mock.calls.at(-1)[0].dest).toEqual([16,10]);
 s.session.ping.value = 1000;
 moveDirection(1,0);expect(s.send.mock.calls.at(-1)[0].dest).toEqual([16,10]);
});

it('deduplicates recent destinations but retries requests that the server may have rejected', () => {
 moveDirection(1,0);vi.advanceTimersByTime(100);moveDirection(1,0);
 expect(s.send).toHaveBeenCalledOnce();
 vi.advanceTimersByTime(100);moveDirection(1,0);expect(s.send).toHaveBeenCalledTimes(2);
 moveDirection(0,1);expect(s.send.mock.calls.at(-1)[0].dest).toEqual([10,12]);
 moveDirection(1,0);expect(s.send.mock.calls.at(-1)[0].dest).toEqual([12,10]);
 expect(s.send).toHaveBeenCalledTimes(4);
});

it('clears duplicate suppression on stop and does not remember a failed socket send', () => {
 moveDirection(1,0);movement.stop();moveDirection(1,0);expect(s.send).toHaveBeenCalledTimes(2);
 movement.stop();s.send.mockReturnValueOnce(false);
 moveDirection(1,0);moveDirection(1,0);expect(s.send).toHaveBeenCalledTimes(4);
});

it('does not suppress movement when the player entity is replaced', () => {
 moveDirection(1,0);s.session.Entity = {...s.session.Entity};moveDirection(1,0);
 expect(s.send).toHaveBeenCalledTimes(2);
});
