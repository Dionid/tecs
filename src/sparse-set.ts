// # Sparse Set
export type SparseSet<T extends number> = {
  sparse: T[];
  dense: T[];
};

export const SparseSet = {
  new: () => {
    return {
      sparse: [],
      dense: [],
    };
  },
  has: <T extends number>(sSet: SparseSet<T>, x: T) => {
    return sSet.dense[sSet.sparse[x]] === x;
  },
  add: <T extends number>(sSet: SparseSet<T>, value: T) => {
    if (
      value >= sSet.sparse.length ||
      sSet.sparse[value] === undefined ||
      sSet.sparse[value]! >= sSet.dense.length ||
      sSet.dense[sSet.sparse[value]!] !== value
    ) {
      sSet.sparse[value] = sSet.dense.length as T;
      sSet.dense.push(value);
      return true;
    }
    return false;
  },
  remove: <T extends number>(sSet: SparseSet<T>, value: T) => {
    if (sSet.dense[sSet.sparse[value]!] === value) {
      const swap = sSet.dense.pop()!;
      if (swap !== value) {
        sSet.dense[sSet.sparse[value]!] = swap;
        sSet.sparse[swap] = sSet.sparse[value]!;
      }
      return true;
    }
    return false;
  },
};
