export function createChatPanel(body, send, initialReceiver = '') {
	body.innerHTML =
		'<div class="skills-toolbar"><select aria-label="消息筛选"><option value="all">全部消息</option><option value="public">公开</option><option value="private">私聊</option><option value="party">队伍</option><option value="guild">公会</option><option value="clan">氏族</option><option value="system">系统</option></select></div><div class="chat-log" role="log" aria-label="聊天消息"></div><form class="chat-form"><select aria-label="发送频道"><option value="public">公开</option><option value="private">私聊</option><option value="party">队伍</option><option value="guild">公会</option><option value="clan">氏族</option></select><input aria-label="私聊对象" maxlength="24" placeholder="角色名" hidden><input aria-label="聊天内容" placeholder="输入消息" maxlength="120" autocomplete="off"><button type="submit">发送</button></form><p role="status"></p>';
	const $ = selector => body.querySelector(selector),
		log = $('.chat-log'),
		channel = $('[aria-label="发送频道"]'),
		receiver = $('[aria-label="私聊对象"]'),
		input = $('[aria-label="聊天内容"]');
	let messages = [];
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
					p.textContent = m.text;
					return p;
				})
		);
		if (atBottom) log.scrollTop = log.scrollHeight;
	}
	$('[aria-label="消息筛选"]').onchange = () => update();
	$('form').onsubmit = event => {
		event.preventDefault();
		const error = send(input.value, channel.value, receiver.value);
		$('[role=status]').textContent = error || '已发送';
		if (!error) input.value = '';
	};
	return { update };
}
