/** Portal scripts have internal route names rather than player-facing NPC names. */
export function npcDialogueTitle(entity) {
	if (entity?._job === 45) return '传送入口';
	return entity?.display?.name?.split('#')[0].trim() || '对话';
}
