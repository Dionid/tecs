// # Sparse Set
export type SparseSet = {
  sparse: number[];
  dense: number[];
};

export const SparseSet = {
  new: () => {
    return {
      sparse: [],
      dense: [],
    };
  },
  has: (sSet: SparseSet, x: number) => {
    return sSet.dense[sSet.sparse[x]] === x;
  },
  add: (sSet: SparseSet, value: number) => {
    const denseInd = sSet.sparse[value] as number | undefined;
    if (
      value >= sSet.sparse.length ||
      denseInd === undefined ||
      denseInd >= sSet.dense.length ||
      sSet.dense[denseInd] !== value
    ) {
      sSet.sparse[value] = sSet.dense.length;
      sSet.dense.push(value);
      return true;
    }
    return false;
  },
  remove: (sSet: SparseSet, value: number) => {
    const denseInd = sSet.sparse[value];
    if (sSet.dense[denseInd] === value && sSet.dense.length > 0) {
      const swap = sSet.dense.pop()!;
      if (swap !== value) {
        sSet.dense[denseInd] = swap;
        sSet.sparse[swap] = denseInd;
      }
      return swap;
    }
    return -1;
  },
};

// // # Sparse Set With Data
// export type SparseSetData<Data> = {
//   sparse: number[];
//   dense: number[];
//   data: Data[];
// };

// export const SparseSetData = {
//   new: () => {
//     return {
//       sparse: [],
//       dense: [],
//       data: [],
//     };
//   },
//   has: <Data>(sSet: SparseSetData<Data>, value: number) => {
//     return sSet.dense[sSet.sparse[value]] === value;
//   },
//   set: <Data>(sSet: SparseSetData<Data>, value: number, data: Data) => {
//     const denseInd = sSet.sparse[value];

//     if (
//       value >= sSet.sparse.length ||
//       denseInd === undefined ||
//       denseInd! >= sSet.dense.length ||
//       sSet.dense[denseInd!] !== value
//     ) {
//       sSet.sparse[value] = sSet.dense.length;
//       sSet.dense.push(value);
//       sSet.data.push(data);
//       return true;
//     }

//     if (
//       value < sSet.sparse.length &&
//       denseInd !== undefined &&
//       denseInd < sSet.dense.length &&
//       sSet.dense[denseInd!] === value
//     ) {
//       sSet.data[denseInd] = data;
//       return true;
//     }

//     return false;
//   },
//   remove: <Data>(sSet: SparseSetData<Data>, value: number) => {
//     const denseInd = sSet.sparse[value];

//     if (!denseInd) {
//       return false;
//     }

//     if (sSet.dense[denseInd] === value) {
//       const swapId = sSet.dense.pop()!;
//       const swapData = sSet.data.pop()!;
//       if (swapId !== value) {
//         sSet.dense[denseInd] = swapId;
//         sSet.data[denseInd] = swapData;
//         sSet.sparse[swapId] = denseInd;
//       }
//       return true;
//     }

//     return false;
//   },
// };
