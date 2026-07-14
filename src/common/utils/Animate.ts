/** @format */

export namespace Animation {
	export function linear(t: number) {
		return t;
	}

	export function easeInQuad(t: number) {
		return t * t;
	}

	export function easeOutQuad(t: number) {
		return t * (2 - t);
	}

	export function easeInOutQuad(t: number) {
		return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
	}

	export function easeInCubic(t: number) {
		return t * t * t;
	}

	export function easeOutCubic(t: number) {
		return --t * t * t + 1;
	}

	export function easeInOutCubic(t: number) {
		return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
	}

	export function easeOutBounce(t: number) {
		if (t < 1 / 2.75) {
			return 7.5625 * t * t;
		} else if (t < 2 / 2.75) {
			return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
		} else if (t < 2.5 / 2.75) {
			return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
		} else {
			return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
		}
	}

	export function easeOutElastic(t: number) {
		const c4 = (2 * Math.PI) / 3;
		return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - 0.075) * c4) + 1;
	}
}
