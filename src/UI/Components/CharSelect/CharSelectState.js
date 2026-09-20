export function upsertCharacterBySlot(characters, character) {
	const index = characters.findIndex(value => value.CharNum === character.CharNum);
	if (index === -1) {
		characters.push(character);
	} else {
		characters[index] = character;
	}
	return index;
}
