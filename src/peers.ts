import z from 'zod'
import fs from "fs";

// Question 2.1
export const BOOTSTRAP_PEERS: string[] = [
  "95.179.158.137:18018",
  "95.179.132.22:18018",
  "45.32.235.245:18018",
];

// Question 2.2
const PEERS_FILE = `storage/discovered_peers.txt`;

const discoveredPeers = new Set<string>();

function get_peers(): Set<string> {
  const peers = new Set<string>(BOOTSTRAP_PEERS);

  try {
    const contents = fs.readFileSync(PEERS_FILE, "utf8");
    for (const line of contents.split("\n")) {
      const p = line.trim();
      if (p.length > 0) peers.add(p);
    }
  } catch {
    // If file missing/unreadable, just return bootstrap peers.
  }

  return peers;
}

// Question 2.5
function add_peer(peer_id: string) {

}

export {get_peers, add_peer}