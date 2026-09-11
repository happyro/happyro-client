/**
 * Combine a bank amount field with a preset addend.
 * MAX stays MAX; any other value is treated as an integer (empty → 0).
 */
export function addValueToInput(inputValue, addValue) {
	if (inputValue === 'MAX') {
		return 'MAX';
	}
	const currentValue = parseInt(inputValue, 10) || 0;
	return currentValue + addValue;
}
