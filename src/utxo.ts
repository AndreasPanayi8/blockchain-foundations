class UTXO {
  private outpoints : Map<string, number>
  private toSpend : Map <string, number>

  constructor() {
    this.outpoints = new Map<string, number>();
    this.toSpend = new Map<string, number>();

    // TODO: load UTXO
  }

  async add_outpoint(outpointkey: string, amount: number) {
    if(!this.outpoints.has(outpointkey)) {
      this.outpoints.set(outpointkey, amount);
    }
  }

  async spend(outpointkey: string, amount: number) {
    const outAmount = this.outpoints.get(outpointkey);
    if (outAmount === undefined) {
      throw new Error(`Outpoint key ${outpointkey} not found in UTXO`);
    }

    const alreadySpent = this.outpoints.get(outpointkey);
    
    if (alreadySpent === undefined) {
      if (outAmount < amount) {
        throw new Error(`INVALID_TX_OUTPOINT`);
      }
      this.toSpend.set(outpointkey, amount);
    } else {
      if (outAmount < amount + alreadySpent) {
        throw new Error(`INVALID_TX_OUTPOINT`);
      }

      this.toSpend.set(outpointkey, amount + alreadySpent);
    }

  }

  async apply_transactions() {
    for (const [outpointkey, amount] of this.toSpend) {
      const oldAmount = this.outpoints.get(outpointkey);
      if (oldAmount === undefined) {
        throw new Error(`Outpoint key ${outpointkey} not found in UTXO`);
      }

      this.outpoints.set(outpointkey, oldAmount - amount);
    }
    this.toSpend.clear();
  }
}