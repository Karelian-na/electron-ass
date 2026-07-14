/** @format */

export class BiMap<K, V> {
	private _keyToValue: Map<K, V>;
	private _valueToKey: Map<V, K>;

	constructor() {
		this._keyToValue = new Map<K, V>();
		this._valueToKey = new Map<V, K>();
	}

	set(key: K, value: V): void {
		if (this._keyToValue.has(key)) {
			const oldValue = this._keyToValue.get(key);
			if (oldValue !== undefined) {
				this._valueToKey.delete(oldValue);
			}
		}
		if (this._valueToKey.has(value)) {
			const oldKey = this._valueToKey.get(value);
			if (oldKey !== undefined) {
				this._keyToValue.delete(oldKey);
			}
		}
		this._keyToValue.set(key, value);
		this._valueToKey.set(value, key);
	}

	getByKey(key: K): V | undefined {
		return this._keyToValue.get(key);
	}

	getByValue(value: V): K | undefined {
		return this._valueToKey.get(value);
	}

	hasKey(key: K): boolean {
		return this._keyToValue.has(key);
	}

	hasValue(value: V): boolean {
		return this._valueToKey.has(value);
	}

	deleteByKey(key: K): boolean {
		const value = this._keyToValue.get(key);
		if (value !== undefined) {
			this._keyToValue.delete(key);
			this._valueToKey.delete(value);
			return true;
		}
		return false;
	}

	deleteByValue(value: V): boolean {
		const key = this._valueToKey.get(value);
		if (key !== undefined) {
			this._valueToKey.delete(value);
			this._keyToValue.delete(key);
			return true;
		}
		return false;
	}

	clear(): void {
		this._keyToValue.clear();
		this._valueToKey.clear();
	}

	size(): number {
		return this._keyToValue.size;
	}
}
