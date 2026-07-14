/** @format */

import type { IService } from "./ServiceProvider";

export enum LogLevel {
	Off,
	Trace,
	Debug,
	Info,
	Warn,
	Error,
}

export class MainLogService implements ILogService {
	public static readonly DEFAULT_LOG_LEVEL = LogLevel.Info;

	constructor(private _logLevel = MainLogService.DEFAULT_LOG_LEVEL) {}

	verbose(message: string): void {
		if (this._logLevel != LogLevel.Off && this._logLevel === LogLevel.Trace) {
			console.trace(message);
		}
	}

	debug(message: string): void {
		if (this._logLevel != LogLevel.Off && this._logLevel <= LogLevel.Debug) {
			console.debug(message);
		}
	}

	info(message: string): void {
		if (this._logLevel != LogLevel.Off && this._logLevel <= LogLevel.Info) {
			console.info(message);
		}
	}

	warn(message: string): void {
		if (this._logLevel != LogLevel.Off && this._logLevel <= LogLevel.Warn) {
			console.warn(message);
		}
	}

	error(message: string): void {
		if (this._logLevel != LogLevel.Off && this._logLevel <= LogLevel.Error) {
			console.error(message);
		}
	}

	setLevel(level: LogLevel): LogLevel {
		let oldLevel = this._logLevel;
		this._logLevel = level;
		return oldLevel;
	}

	getLevel(): LogLevel {
		return this._logLevel;
	}

	clear(): void {}
}

export interface ILogService extends IService {
	/**
	 * Appends stack information to the log output object.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {string} message the log message
	 */
	verbose(message: string): void;

	/**
	 * Appends debug information to the log output object.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {string} message the log message
	 */
	debug(message: string): void;

	/**
	 * Appends information to the log output object.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {string} message the log message
	 */
	info(message: string): void;

	/**
	 * Appends warning information to the log output object.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {string} message the log message
	 */
	warn(message: string): void;

	/**
	 * Appends error information to the log output object.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {string} message the log message
	 */
	error(message: string): void;

	/**
	 * Sets the current log level of the logger.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 * @param {LogLevel} level the log level
	 */
	setLevel(level: LogLevel): LogLevel;

	/**
	 * Gets the current log level of the logger.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 */
	getLevel(): LogLevel;

	/**
	 * Clears the current log records.
	 *
	 * @author Karelian_na
	 * @date 2023/08/05
	 */
	clear(): void;
}
