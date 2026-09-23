import Session from 'Engine/SessionStorage.js';
import Network from 'Network/NetworkManager.js';
import PACKET from 'Network/PacketStructure.js';
import { openGameSelection } from './GameSelection.js';
import { loadCartPreview } from 'UI/Mobile/game/CartPreview.js';

const levels = [0, 41, 66, 81, 91, 101, 112, 122, 132];
const decorative = [10, 11, 12];
export function openCartAppearance(offer) {
	const valid = id =>
		Boolean(Session.Entity?.hasCart) && (offer ? decorative.includes(id) : Session.Entity.clevel >= levels[id - 1]);
	const types = offer ? (offer.typeList?.length ? offer.typeList : decorative) : levels.map((_, i) => i + 1);
	const entries = [...new Set(types)].filter(valid).map(id => ({
		id,
		preview: true,
		name: `手推车外观 ${id}`,
		description: offer ? '装饰手推车' : `需要基础等级 ${levels[id - 1] || 1}`,
		validate: () => valid(id),
		loadIcon: callback => loadCartPreview(id, callback)
	}));
	return openGameSelection(
		'更换手推车外观',
		entries,
		id => {
			const packet = offer ? new PACKET.CZ.SELECTCART() : new PACKET.CZ.REQ_CHANGECART();
			if (offer) {
				packet.identity = offer.identity;
				packet.type = id;
			} else packet.num = id;
			Network.sendPacket(packet);
		},
		() => {}
	);
}
