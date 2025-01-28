export interface SetNumber {
  delete(value: number): boolean;
  empty: boolean;
}

class LimitedSetNumber implements SetNumber {

  #set: Set<number>;

  get empty(): boolean {
    return this.#set.size === 0;
  }

  constructor(numbers: number[]) {
    this.#set = new Set(numbers);
  }

  delete(value: number): boolean {
    return this.#set.delete(value);
  }
}

class AllSetNumber implements SetNumber {

  get empty(): boolean {
    return false;
  }

  delete(_value: number): boolean {
    return true;
  }
}

export function fromNumberArray(numbers: number[]): SetNumber {
  return new LimitedSetNumber(numbers);
}

export function fromNumbers(...numbers: number[]): SetNumber {
  return new LimitedSetNumber(numbers);
}

export function allNumbers() {
  return new AllSetNumber();
}
