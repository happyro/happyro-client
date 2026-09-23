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
	types: { TYPE_MOB: 1, TYPE_PC: 2, TYPE_NPC: 3, TYPE_ITEM: 4 }
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
	moveDirection,
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
	expect(targetSnapshot().interaction).toBe('交谈');
	interactSelected();
	expect(s.target.onMouseDown).toHaveBeenCalledOnce();
	s.target = entity(4);
	expect(targetSnapshot().interaction).toBe('拾取');
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
