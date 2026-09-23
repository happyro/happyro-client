import { toPlainRagnarokText } from 'Utils/RagnarokText.js';
/** Native scrolling and explicit actions replace mail attachment drag/drop. */
export function createMailPanel(body, service) {
	let version = -1,
		tab = 0,
		page = 0,
		term = '',
		review = null;
	const controls = [],
		detail = document.createElement('section'),
		list = document.createElement('section'),
		status = document.createElement('p');
	list.className = 'inventory-list';
	detail.className = 'inventory-detail';
	status.role = 'status';
	const layout = document.createElement('div');
	layout.className = 'inventory-layout';
	layout.append(list, detail);
	status.className = 'inventory-status';
	body.replaceChildren(layout, status);
	const button = (parent, label, action) => {
		const b = document.createElement('button');
		b.type = 'button';
		if (parent === list) b.className = 'inventory-item';
		b.textContent = label;
		b.onclick = () => {
			action();
			update();
		};
		parent.append(b);
		controls.push(b);
		return b;
	};
	const para = (parent, text) => {
		const p = document.createElement('p');
		p.textContent = text;
		p.className = 'item-description';
		p.style.overflowWrap = 'anywhere';
		parent.append(p);
		return p;
	};
	const field = (parent, label, value, oninput, type = 'text') => {
		const row = document.createElement('label'),
			input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
		if (type !== 'textarea') input.type = type;
		input.value = value;
		input.oninput = () => {
			review = null;
			oninput(type === 'number' ? Number(input.value) : input.value);
		};
		row.append(document.createTextNode(label), input);
		parent.append(row);
		controls.push(input);
		return input;
	};
	const mailKey = m => `${m.openType}:${m.MailID}`;
	function render() {
		const state = service.snapshot();
		version = state.revision;
		controls.length = 0;
		list.replaceChildren();
		detail.replaceChildren();
		if (state.writing) {
			para(list, '背包：点击物品选择附件');
			for (const item of state.inventory)
				button(list, `${item.name} × ${item.count}`, () => {
					const count = Number(quantity.value);
					service.add(item.index, item.ID, count);
				});
			const quantity = field(detail, '每次添加数量', 1, () => {}, 'number');
			quantity.min = 1;
			quantity.max = 32767;
			quantity.inputMode = 'numeric';
			const form = document.createElement('div');
			form.className = 'social-form';
			detail.append(form);
			field(form, '收件人', state.draft.receiver, value => service.change('receiver', value));
			button(form, '校验收件人', () => service.validate());
			field(form, '标题（最多 39 字节）', state.draft.title, value => service.change('title', value));
			field(form, '正文（最多 499 字节）', state.draft.body, value => service.change('body', value), 'textarea');
			const amount = field(form, '附加 Zeny', state.draft.zeny, value => service.change('zeny', value), 'number');
			amount.min = 0;
			amount.max = 2147483647;
			amount.inputMode = 'numeric';
			para(detail, `当前附件重量 ${state.weight}；实际限制由服务器检查`);
			for (const item of state.attachments) {
				para(detail, `${item.name} × ${item.count}`);
				para(detail, item.description);
				button(detail, `移除 ${item.name}`, () => service.remove(item.index, item.count));
			}
			para(detail, '预计邮费：每种附件 2500 Zeny，附加金额的 2%；最终以服务器配置为准。');
			const summary = para(detail, ''),
				confirm = button(detail, '确认发送', () => {
					if (review) service.send(review);
					review = null;
					summary.textContent = '';
					confirm.hidden = true;
				});
			confirm.hidden = true;
			button(detail, '核对发送内容', () => {
				review = service.review();
				if (review.error) {
					summary.textContent = review.error;
					review = null;
					confirm.hidden = true;
					return;
				}
				summary.textContent = `发送给 ${review.receiver}：${review.title}；附件 ${review.items.length} 种，金额 ${review.zeny}，预计邮费 ${review.fee}。`;
				confirm.hidden = false;
			});
			button(detail, '取消写信', () => {
				service.cancelCompose();
				review = null;
			});
		} else {
			const filters = document.createElement('div');
			list.append(filters);
			for (const [value, label] of [
				[0, '个人'],
				[1, '账号'],
				[2, '退回']
			])
				button(filters, label, () => {
					tab = value;
					page = 0;
					render();
				});
			const search = field(list, '搜索标题或寄件人', term, value => {
				term = value;
				page = 0;
			});
			button(list, '搜索', () => render());
			search.onkeydown = event => {
				if (event.key === 'Enter') {
					event.preventDefault();
					render();
					update();
				}
			};
			const rows = state.list.filter(m => m.openType === tab && `${m.title} ${m.SenderName}`.includes(term));
			const pages = Math.max(1, Math.ceil(rows.length / 8));
			page = Math.min(page, pages - 1);
			for (const mail of rows.slice(page * 8, page * 8 + 8))
				button(
					list,
					`${mail.Isread ? '' : '未读 · '}${mail.title} — ${mail.SenderName}${mail.deleting ? '（请求删除中）' : ''}`,
					() => {
						review = null;
						service.read(mailKey(mail));
					}
				);
			para(list, `${page + 1} / ${pages} 页，共 ${rows.length} 封`);
			button(list, '上一页', () => {
				page = Math.max(0, page - 1);
				render();
			});
			button(list, '下一页', () => {
				page = Math.min(pages - 1, page + 1);
				render();
			});
			button(list, '刷新', () => {
				review = null;
				service.refresh();
			});
			button(list, '写信', () => service.compose());
			const mail = state.detail;
			if (mail) {
				para(detail, mail.title);
				para(detail, `寄件人：${mail.SenderName}`);
				para(detail, toPlainRagnarokText(mail.Textcontent));
				para(detail, `附加金额：${mail.zeny} Zeny`);
				for (const item of mail.describedItems) {
					para(detail, `${item.name} × ${item.count}`);
					para(detail, item.description);
				}
				if (mail.zeny) button(detail, '领取金额', () => service.claim('zeny'));
				if (mail.ItemList.length) button(detail, '领取物品', () => service.claim('items'));
				if (!mail.zeny && !mail.ItemList.length) {
					const confirm = button(detail, '确认删除邮件', () => {
						service.delete();
						confirm.hidden = true;
					});
					confirm.hidden = true;
					button(detail, '删除邮件', () => {
						confirm.hidden = false;
					});
				}
			} else para(detail, '请选择邮件；领取附件前请预留背包容量和负重。');
		}
	}
	function update() {
		const state = service.snapshot();
		if (version !== state.revision) render();
		for (const control of controls) control.disabled = !state.allowed;
		status.textContent = state.message;
	}
	render();
	update();
	return { update };
}
