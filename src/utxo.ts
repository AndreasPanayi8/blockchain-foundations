import { Level } from "level";

export type UTXOEntry = {
  pubkey: string;
  value: number;
};

export type UTXOState = Record<string, UTXOEntry>;

export function outpointKey(txid: string, index: number): string {
  return `${txid}:${index}`;
}

export class UTXOManager {
  private db = new Level<string, UTXOState>("./storage/utxos", {
    valueEncoding: "json",
  });

  emptyState(): UTXOState {
    return {};
  }

  cloneState(state: UTXOState): UTXOState {
    return Object.fromEntries(
      Object.entries(state).map(([k, v]) => [k, { ...v }])
    );
  }

  async exists(blockid: string): Promise<boolean> {
    return await this.db.has(blockid);
  }

  async get(blockid: string): Promise<UTXOState> {
    try {
      return await this.db.get(blockid);
    } catch {
      throw new Error(`UTXO state for block ${blockid} not found`);
    }
  }

  async put(blockid: string, state: UTXOState): Promise<void> {
    await this.db.put(blockid, state);
  }

  async getBaseState(previd: string | null): Promise<UTXOState | null> {
    if (previd === null) {
      return this.emptyState();
    }

    if (!(await this.exists(previd))) {
      return null;
    }

    const parentState = await this.get(previd);
    return this.cloneState(parentState);
  }

  hasOutpoint(state: UTXOState, key: string): boolean {
    return state[key] !== undefined;
  }

  getOutpoint(state: UTXOState, key: string): UTXOEntry | undefined {
    return state[key];
  }

  spendOutpoint(state: UTXOState, key: string): UTXOEntry {
    const entry = state[key];
    if (entry === undefined) {
      throw new Error("INVALID_TX_OUTPOINT");
    }

    delete state[key];
    return entry;
  }

  addOutpoint(
    state: UTXOState,
    txid: string,
    index: number,
    output: UTXOEntry
  ): void {
    state[outpointKey(txid, index)] = { ...output };
  }

  addOutputs(
    state: UTXOState,
    txid: string,
    outputs: Array<UTXOEntry>
  ): void {
    outputs.forEach((output, index) => {
      this.addOutpoint(state, txid, index, output);
    });
  }
}

export const utxoManager = new UTXOManager();