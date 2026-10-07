import { chatChannelLabels } from './ChatChannels.js';
import { chatEmotions } from 'UI/Game/ChatEmotions.js';
import { createFeedback } from 'UI/Components/Feedback.js';
export function createChatPanel(body, send, initialReceiver = '', loadEmotionImages, onSent) {
	body.innerHTML =
		'<div class="skills-toolbar"><select aria-label="消息筛选"><option value="all">全部消息</option><option value="public">附近</option><option value="private">私聊</option><option value="party">队伍</option><option value="guild">公会</option><option value="clan">氏族</option><option value="system">系统</option></select></div><div class="chat-log" role="log" aria-label="聊天消息"></div><div class="chat-emotions" hidden aria-label="RO 表情"></div><form class="chat-form"><select aria-label="发送频道"><option value="public">附近</option><option value="private">私聊</option><option value="party">队伍</option><option value="guild">公会</option><option value="clan">氏族</option></select><input aria-label="私聊对象" maxlength="24" placeholder="角色名" hidden><input data-input-submit aria-label="聊天内容" placeholder="输入消息" maxlength="120" autocomplete="off" enterkeyhint="send"><button type="button" data-emotions aria-label="选择表情" aria-expanded="false">表情</button><button type="submit">发送</button></form>';
	const feedback = createFeedback(body);
	const $ = selector => body.querySelector(selector),
		log = $('.chat-log'),
		channel = $('[aria-label="发送频道"]'),
		receiver = $('[aria-label="私聊对象"]'),
		input = $('[aria-label="聊天内容"]');
	let messages = [];
	const palette = $('.chat-emotions'),
		toggle = $('[data-emotions]');
	let loading;
	async function ensureEmotions() {
		if (loading) return loading;
		palette.textContent = '正在加载表情…';
		loading = loadEmotionImages()
			.then(images => {
				if (!body.contains(palette)) return;
				palette.replaceChildren();
				for (const [command, label] of chatEmotions) {
					const button = document.createElement('button');
					button.type = 'button';
					button.title = `${label} /${command}`;
					button.setAttribute('aria-label', label);
					const icon = document.createElement('img');
					icon.src = images[command];
					icon.alt = '';
					icon.width = icon.height = 40;
					button.append(icon);
					button.onclick = () => {
						input.value = `/${command}`;
						input.dispatchEvent(new Event('input', { bubbles: true }));
						palette.hidden = true;
						toggle.setAttribute('aria-expanded', 'false');
					};
					palette.append(button);
				}
			})
			.catch(() => {
				loading = null;
				palette.textContent = '表情加载失败，请重新打开';
				feedback('表情加载失败', 'error');
			});
		return loading;
	}
	toggle.onclick = () => {
		palette.hidden = !palette.hidden;
		toggle.setAttribute('aria-expanded', String(!palette.hidden));
		if (!palette.hidden) void ensureEmotions();
	};
	for (const region of [$('form'), palette])
		region.addEventListener('pointerdown', event => {
			if (event.target.closest('button')) event.preventDefault();
		});
	channel.onchange = () => {
		receiver.hidden = channel.value !== 'private';
	};
	if (initialReceiver) {
		channel.value = 'private';
		receiver.value = initialReceiver;
		channel.onchange();
	}
	function update(next = messages) {
		messages = next;
		const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 24;
		const filter = $('[aria-label="消息筛选"]').value;
		log.replaceChildren(
			...messages
				.filter(m => filter === 'all' || m.channel === filter)
				.map(m => {
					const p = document.createElement('p');
					p.dataset.channel = m.channel;
					p.textContent = `[${chatChannelLabels[m.channel] || '系统'}] ${m.text}`;
					return p;
				})
		);
		if (atBottom) log.scrollTop = log.scrollHeight;
	}
	$('[aria-label="消息筛选"]').onchange = () => update();
	let composing = false;
	input.addEventListener('compositionstart', () => {
		composing = true;
	});
	input.addEventListener('compositionend', () => {
		composing = false;
	});
	$('form').onsubmit = event => {
		event.preventDefault();
		if (composing) return;
		const error = send(input.value, channel.value, receiver.value);
		if (error) feedback(error, 'error');
		if (!error) {
			input.value = '';
			input.blur();
			palette.hidden = true;
			toggle.setAttribute('aria-expanded', 'false');
			onSent?.();
		}
	};
	return { update };
}
