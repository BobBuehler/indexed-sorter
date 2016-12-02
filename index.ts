interface Dictionary<T> {
    [index: string]: T;
}

export interface CompareFn<T> {
    (a: T, b: T): number;
}

export interface Comparer<T> {
    name: string;
    compare: CompareFn<T>;
}

export interface SortConfig<T> {
    comparers: Comparer<T>[];
    orders: boolean[];
}

class LearningIndex<T> {
    private itemToKey: (item: T) => string;
    private baseCompare: CompareFn<T>;
    private index: Dictionary<number>;
    
    private pendingDataset: T[] | null;
    
    compareFn: CompareFn<T>;
    
    constructor(itemToKey: (item: T) => string, compare: CompareFn<T>) {
        this.itemToKey = itemToKey;
        this.baseCompare = compare;
        this.index = {};
        
        this.pendingDataset = null;
        
        this.compareFn = this.compare.bind(this);
    }
    
    compare(a: T, b: T): number {
        const aIndex = this.index[this.itemToKey(a)];
        const bIndex = this.index[this.itemToKey(b)];
        if (aIndex !== undefined && bIndex !== undefined) {
            return compareNumbers(aIndex, bIndex);
        } else if (this.pendingDataset !== null) {
            this.indexDataset(this.pendingDataset);
            this.pendingDataset = null;
            return this.compare(a, b);
        } else {
            return this.baseCompare(a, b);
        }
    }
    
    indexDatasetLazily(dataset: T[]) {
        this.pendingDataset = dataset;
    }
    
    indexDataset(dataset: T[]) {
        const oldIndex = this.index;
        this.index = {};
        
        const sorted = dataset.sort((a: T, b: T) => {
            const aIndex = oldIndex[this.itemToKey(a)];
            const bIndex = oldIndex[this.itemToKey(b)];
            if (aIndex !== undefined && bIndex !== undefined) {
                return compareNumbers(aIndex, bIndex);
            } else {
                return this.baseCompare(a, b);
            }
        });
        
        sorted.forEach((item, i) => {
            this.index[this.itemToKey(item)] = i;
        });
    }
}

export class LearningSorter<T> {
    private itemToKey: (item: T) => string;
    private indexes: Dictionary<LearningIndex<T>>;
    
    constructor(itemToKey: (item: T) => string, comparers: Comparer<T>[]) {
        this.itemToKey = itemToKey;
        this.indexes = {};
        comparers.forEach((comparer: Comparer<T>) => {
            this.indexes[comparer.name] = new LearningIndex(itemToKey, comparer.compare.bind(comparer));
        });
    }
    
    getComparer(config: SortConfig<T>): CompareFn<T> {
        const compareFns = config.comparers.map((comparer: Comparer<T>) => {
            const index = this.indexes[comparer.name];
            if (index) {
                return index.compareFn;
            } else {
                return comparer.compare.bind(comparer);
            }
        });
        
        const orderMultipliers = config.orders.map((order: boolean) => {
            return order ? 1 : -1;
        });
        
        return (a: T, b: T) => {
            for (let i = 0; i < compareFns.length; ++i) {
                const result = compareFns[i](a, b);
                if (result !== 0) {
                    return result * orderMultipliers[i];
                }
            }
            return 0;
        }
    }
    
    indexDatasetLazily(dataset: T[]) {
        Object.keys(this.indexes).forEach((key: string) => {
            this.indexes[key].indexDatasetLazily(dataset);
        });
    }
    
    indexDataset(dataset: T[]) {
        Object.keys(this.indexes).forEach((key: string) => {
            this.indexes[key].indexDataset(dataset);
        });
    }
}

function compareNumbers(a: number, b: number): number {
    return a < b ? -1 : a > b ? 1 : 0;
}
