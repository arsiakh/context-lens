import {
  HIGHLIGHT_GUIDE_DISMISSED_KEY,
  persistHighlightGuideDismissal,
  shouldShowHighlightGuide,
  type KeyValueStorage,
} from "./highlightGuideStorage";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`PASS ✓ ${name}`);
  } else {
    failed++;
    console.log(`FAIL ✗ ${name}`);
  }
}

function memoryStorage(initialValue: string | null = null): KeyValueStorage & { value: string | null } {
  return {
    value: initialValue,
    async getItem() {
      return this.value;
    },
    async setItem(_key, value) {
      this.value = value;
    },
  };
}

async function run() {
  const fresh = memoryStorage();
  check("shows the guide when no dismissal exists", await shouldShowHighlightGuide(fresh));

  await persistHighlightGuideDismissal(fresh);
  check("stores the versioned dismissal value", fresh.value === "true");
  check("hides the guide after dismissal", !(await shouldShowHighlightGuide(fresh)));
  check("uses a versioned storage key", HIGHLIGHT_GUIDE_DISMISSED_KEY.endsWith(":v1"));

  const failing: KeyValueStorage = {
    async getItem() {
      throw new Error("read failed");
    },
    async setItem() {
      throw new Error("write failed");
    },
  };
  check("shows the guide when storage cannot be read", await shouldShowHighlightGuide(failing));
  await persistHighlightGuideDismissal(failing);
  check("storage write failures do not escape", true);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void run();
