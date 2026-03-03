import { Level } from "level";
import canonicalize from "canonicalize";
import { utf8ToBytes } from "@noble/hashes/utils.js";
import { blake2s } from "@noble/hashes/blake2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { NetworkObject } from "./types";
import { object } from "zod";

const FIND_TIMEOUT_MS = 5000

type Waiter = {
    resolve: (obj: NetworkObject) => void;
    reject: (err: Error) => void;
    timer: ReturnType< typeof setTimeout>;
}

export class ObjectManager{
    private db = new Level<string, NetworkObject>("./storage/objects",{
        valueEncoding: "json"   
    });

    private pending: Map<string, Waiter[]> = new Map();
    private requested = new Set<string>();
    

    objectId(object: NetworkObject): string{
        const c = canonicalize(object);
        if (!c) throw new Error("Failed to canonicalize object");
        return bytesToHex(blake2s(utf8ToBytes(c)));
    }

    async exists(objectid: string): Promise<boolean>{
        return await this.db.has(objectid);
    }

    async get(objectid: string): Promise<NetworkObject>{
        //Level throws if missing
        return await this.db.get(objectid);
    }

    async put(object: NetworkObject): Promise<string>{
        const id = this.objectId(object);
        // Store under its content-derived id
        await this.db.put(id, object);

        const waiters = this.pending.get(id);
        if (waiters) {
            for (const w of waiters) {
                clearTimeout(w.timer);
                w.resolve(object);
            }
            this.pending.delete(id);
        }

        return id;
    }

    async find(objectid: string, requestFn: (id: string) => void): Promise<NetworkObject>{
        if (await this.exists(objectid)) {
            return await this.get(objectid);
        }
        if(!this.requested.has(objectid)){
            this.requested.add(objectid);
            requestFn(objectid);
        }

        //Wait for it or timeout
        return await new Promise<NetworkObject>((resolve, reject) => {
      const timer = setTimeout(() => {
        const arr = this.pending.get(objectid);
        if (arr) {
          const idx = arr.findIndex((w) => w.resolve === resolve);
          if (idx >= 0) arr.splice(idx, 1);
          if (arr.length === 0) this.pending.delete(objectid);
        }
        this.requested.delete(objectid);
        reject(new Error(`Timeout waiting for object ${objectid}`));
      }, FIND_TIMEOUT_MS);

      const waiter: Waiter = { resolve, reject, timer };
      const arr = this.pending.get(objectid);
      if (arr) arr.push(waiter);
      else this.pending.set(objectid, [waiter]);
    });
  }
}



export const objectManager = new ObjectManager();

    



