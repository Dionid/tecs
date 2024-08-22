export type Includes<T extends readonly any[], U> = T extends [infer Head, ...infer Tail]
  ? Head extends U
    ? true
    : Includes<Tail, U>
  : false;

export type ArrayContains<Arr1 extends readonly any[], Arr2 extends readonly any[]> = {
  [K in keyof Arr2]: Includes<Arr1, Arr2[K]>;
}[number] extends true
  ? true
  : false;
