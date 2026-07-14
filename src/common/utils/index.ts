/** @format */

export type Optional<T> = T | undefined;
export type Nullable<T> = T | null;
export type Emptyable<T> = T | null | undefined;
export type Arrayable<T> = T[] | T;
export type Promisable<T> = T | Promise<T>;

export const EmptyObject = {} as any;

export * from "./Animate";
export * from "./BiMap";
