import fs from "fs";

export const BOOTSTRAP_PEERS: string[] = [
  "95.179.158.137:18018",
  "95.179.132.22:18018",
  "45.32.235.245:18018",
];

const PEERS_FILE = "storage/discovered_peers.txt";

// function ensurePeersFile(): void {
//   const dir = path.dirname(PEERS_FILE);

//   // create storage/ if missing
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }

//   // create file if missing
//   if (!fs.existsSync(PEERS_FILE)) {
//     fs.writeFileSync(PEERS_FILE, "", "utf8");
//   }
// }

function get_peers(): Set<string> {
  // ensurePeersFile();

  const peers = new Set<string>(BOOTSTRAP_PEERS);
  const contents = fs.readFileSync(PEERS_FILE, "utf8");

  for (const line of contents.split("\n")) {
    const p = line.trim();
    if (p.length > 0) peers.add(p);
  }

  return peers;
}

function add_peer(peer: string): void {
  // ensurePeersFile();
  fs.appendFileSync(PEERS_FILE, peer + "\n", "utf8");
}

export {get_peers, add_peer}