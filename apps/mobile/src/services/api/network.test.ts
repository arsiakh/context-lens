import { isOfflineNetInfoState } from "./networkLogic";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) passed++;
  else {
    failed++;
    console.error(`FAIL ✗ ${name}`);
  }
  if (condition) console.log(`PASS ✓ ${name}`);
}

check(
  "treats disconnected devices as offline",
  isOfflineNetInfoState({ isConnected: false, isInternetReachable: null }) === true
);

check(
  "treats unreachable internet as offline",
  isOfflineNetInfoState({ isConnected: true, isInternetReachable: false }) === true
);

check(
  "does not block when reachability is unknown",
  isOfflineNetInfoState({ isConnected: true, isInternetReachable: null }) === false
);

check(
  "does not block when connected and reachable",
  isOfflineNetInfoState({ isConnected: true, isInternetReachable: true }) === false
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
