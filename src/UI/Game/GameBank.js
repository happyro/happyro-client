import Session from 'Engine/SessionStorage.js';
import Configs from 'Core/Configs.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import { showInteraction, interactionSnapshot, clearInteraction } from './ServerInteraction.js';
const MAX = 2147483647;
function send(Type, money) {
	const packet = new Type();
	packet.AID = Session.AID;
	if (money !== undefined) packet.money = money;
	Network.sendPacket(packet);
}
export function requestGameBank(canOperate) {
	if (!Configs.get('enableBank')) return '银行功能未启用';
	if (!canOperate() || !Session.Playing || !Session.Entity || Session.Entity.action === Session.Entity.ACTION.DIE)
		return '当前无法打开银行';
	send(PACKET.CZ.REQ_BANK_OPEN);
	return '已请求打开银行';
}
export function openGameBank(balance) {
	if (interactionSnapshot()?.kind === 'bank') {
		interactionSnapshot().service.receive(balance);
		return interactionSnapshot().service;
	}
	const token = {};
	let money = balance,
		pending = false,
		closed = false,
		message = '',
		guard = () => !Session.FreezeUI;
	const allowed = () =>
		!closed &&
		!pending &&
		interactionSnapshot()?.token === token &&
		guard() &&
		Session.Playing &&
		Session.Entity &&
		Session.Entity.action !== Session.Entity.ACTION.DIE;
	const service = {
		setOperationGuard: value => {
			guard = value;
		},
		snapshot: () => ({
			balance: money,
			wallet: Session.zeny,
			pending,
			allowed: Boolean(allowed()),
			message,
			depositMax: Math.max(0, Math.min(Session.zeny, MAX - money)),
			withdrawMax: Math.max(0, Math.min(money, MAX - Session.zeny))
		}),
		submit(action, amount) {
			const state = service.snapshot();
			if (
				!state.allowed ||
				!['deposit', 'withdraw'].includes(action) ||
				!Number.isInteger(amount) ||
				amount <= 0 ||
				amount > (action === 'deposit' ? state.depositMax : state.withdrawMax)
			)
				return '金额无效、余额不足或超过持有上限';
			pending = true;
			message = '等待服务器回复';
			send(action === 'deposit' ? PACKET.CZ.REQ_BANKING_DEPOSIT : PACKET.CZ.REQ_BANKING_WITHDRAW, amount);
			return message;
		},
		receive(next, reason = 0) {
			if (closed || interactionSnapshot()?.token !== token) return;
			pending = false;
			if (Number.isInteger(next) && next >= 0 && next <= MAX) money = next;
			message = reason === 0 ? '余额已更新' : '服务器拒绝存取，请核对余额、持有上限及当前位置';
		},
		close() {
			if (closed || interactionSnapshot()?.token !== token) return;
			closed = true;
			send(PACKET.CZ.REQ_BANK_CLOSE);
			clearInteraction('bank');
		}
	};
	showInteraction({ kind: 'bank', title: '银行', token, service, close: service.close });
	return service;
}
export function updateGameBank(packet) {
	if (Number.isInteger(packet.zeny) && packet.zeny >= 0 && packet.zeny <= MAX) Session.zeny = packet.zeny;
	if (interactionSnapshot()?.kind === 'bank') interactionSnapshot().service.receive(packet.money, packet.reason);
}
export function closeGameBank() {
	clearInteraction('bank');
}
