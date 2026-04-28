import { Level } from "level";

class HeightManager {
  private db = new Level<string, number>("./storage/heights", {
    valueEncoding: "json",
  });

  async exists(blockid: string): Promise<boolean> {
    return await this.db.has(blockid);
  }

  async get(blockid: string): Promise<number> {
    return await this.db.get(blockid);
  }

  async put(blockid: string, height: number): Promise<void> {
    await this.db.put(blockid, height);
  }
}

export const heightManager = new HeightManager();