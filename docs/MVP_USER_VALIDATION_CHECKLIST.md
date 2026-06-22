# Context Lens MVP — User Validation Checklist

Use this checklist on a release/TestFlight build as a real user would. Test on a physical phone whenever camera, OCR, permissions, deep links, or app-restart behavior is involved.

If a feature is not present in the build, mark it **Blocked / not implemented** rather than failed.

## Test record

- Build/version:
- Commit:
- Date:
- Tester:
- Device and OS:
- Network: Wi-Fi / cellular / offline
- Fresh install or upgrade:

For every failure, record the section, exact steps, expected result, actual result, screenshot or recording, and whether it reproduces.

## 1. Install, launch, and session

- [ ] The app installs and launches without crashing.
- [ ] The splash screen and app icon are correct and not placeholders.
- [ ] A cold launch does not briefly flash the wrong screen.
- [ ] A signed-out user lands on Sign In.
- [ ] A signed-in user returns to the authenticated app after a restart.
- [ ] The interface fits within the notch, Dynamic Island, and home-indicator safe areas.
- [ ] Backgrounding and reopening the app does not lose or corrupt the current flow.

## 2. Account and authentication

### Email and password

- [ ] Creating an account with a valid email and password succeeds.
- [ ] Signing in with valid credentials succeeds.
- [ ] Invalid email input shows an inline, understandable error.
- [ ] A password shorter than six characters is rejected clearly.
- [ ] Incorrect credentials show an inline error and do not crash or navigate forward.
- [ ] Repeatedly tapping the submit button cannot send duplicate requests.
- [ ] Inputs and buttons are disabled appropriately while signing in.

### Magic link

- [ ] A valid email receives a magic link.
- [ ] The confirmation screen displays the correct destination email.
- [ ] “Wrong email? Go back” returns to an editable form.
- [ ] Opening the link launches Context Lens and creates a session.
- [ ] An expired, reused, or malformed link fails safely with an actionable message.

### Session recovery

- [ ] An expired session produces a clear sign-in/session message during analysis.
- [ ] Signing out clears the session and returns to Sign In when sign-out UI is available.
- [ ] Another user cannot see the previous user’s saved content.

## 3. Camera permissions and capture

- [ ] On first use, the operating-system camera permission prompt appears.
- [ ] Granting permission opens the native camera flow.
- [ ] Denying permission does not crash or leave a blank screen.
- [ ] Permanently denying permission shows “Open Settings.”
- [ ] “Open Settings” opens the app’s system settings page.
- [ ] Granting permission in Settings and returning allows capture.
- [ ] Cancelling the native camera returns safely without changing the current state.
- [ ] Capturing a photo starts extraction and shows progress.
- [ ] Repeated taps cannot launch multiple camera or extraction operations.
- [ ] “Cancel” during extraction returns to a usable capture state.

## 4. OCR quality matrix

Photograph real pages and compare the extracted preview with the source. Preserve punctuation, paragraph order, names, and word spelling where possible.

- [ ] Standard serif font in bright, even light.
- [ ] Standard sans-serif font.
- [ ] Small print.
- [ ] Large or decorative chapter heading.
- [ ] Dim light.
- [ ] Uneven light, glare, or a shadow across the page.
- [ ] Slightly blurry image.
- [ ] Angled or perspective-skewed page.
- [ ] Curved text near a book spine.
- [ ] Page containing page numbers and headers/footers.
- [ ] Hyphenated words across line breaks.
- [ ] Smart quotes, em dashes, apostrophes, and accented characters.
- [ ] Dialogue with several short lines.
- [ ] Dense page near the 2,000-character limit.
- [ ] Multi-column page.
- [ ] Non-book text such as a receipt, label, form, or sign.

For each page:

- [ ] The extracted text is readable enough to understand the passage.
- [ ] Reading order is correct.
- [ ] Words are not unexpectedly joined or split.
- [ ] Whitespace and line breaks are normalized without losing words.
- [ ] The app remains responsive and does not expose raw diagnostic output to the user.

## 5. OCR boundary and failure states

- [ ] A blank page or image with no text shows “No text detected” and a Retake action.
- [ ] Fewer than 20 usable characters are rejected instead of being analyzed.
- [ ] More than 2,000 characters are truncated cleanly, preferably at a sentence boundary.
- [ ] An unreadable or corrupt image produces a specific extraction error.
- [ ] OCR taking longer than 15 seconds exits to a retryable timeout state.
- [ ] An unsupported device/platform shows a specific unsupported message.
- [ ] Retake clears the failed OCR result and starts a fresh capture.
- [ ] No analysis request or database write occurs after OCR failure.

## 6. Extracted-text review

- [ ] The extracted passage is visible and scrollable before analysis.
- [ ] A long passage can be reviewed to its end.
- [ ] Optional book-title and author fields accept, edit, and retain text for the analysis request.
- [ ] Retake discards the current passage and returns to capture.
- [ ] Analyze starts exactly one request and navigates to the loading state.
- [ ] Keyboard appearance does not hide fields or primary actions.

## 7. Analysis success and loading

- [ ] “Analyzing passage…” appears immediately after Analyze.
- [ ] The loading screen does not accept duplicate analysis requests.
- [ ] A normal literary passage returns to Reader within an acceptable time.
- [ ] Analysis taking longer than 45 seconds stops and shows a retryable timeout error.
- [ ] Retrying uses the same passage, book title, and author; it does not require a new photo.
- [ ] The returned Reader passage matches the reviewed OCR passage exactly.
- [ ] Annotation content is relevant to the photographed passage.
- [ ] Explanations do not invent events or character history absent from the passage.

## 8. Analysis error states

- [ ] Offline or unreachable server shows a network-specific message and Retry.
- [ ] Server failure shows “Analysis failed,” useful detail, Retry, and Back.
- [ ] Model failure shows a retryable analysis message.
- [ ] Invalid passage input asks the user to retake the photo.
- [ ] Expired authentication tells the user the session expired.
- [ ] Rate limiting explains that the limit was reached and displays retry timing when available.
- [ ] Back returns to a usable prior screen from every error state.
- [ ] A successful retry opens the normal Reader.
- [ ] A failed retry updates the error instead of becoming stuck.

## 9. Book identification

- [ ] High-confidence book identification proceeds without an unnecessary confirmation modal.
- [ ] Low-confidence identification opens the book-title confirmation modal.
- [ ] The inferred title is prefilled when available.
- [ ] The title can be corrected and confirmed.
- [ ] Skip produces a sensible unknown-book state.
- [ ] The modal remains usable with the keyboard open and on a small screen.
- [ ] The Reader header displays the confirmed title and author hint correctly.

## 10. Reader rendering

- [ ] Every character from the passage appears once and in the correct order.
- [ ] Ordinary passage text remains readable and unstyled.
- [ ] Vocabulary, Real-world, and In-book highlights are visually distinct.
- [ ] The legend matches the actual highlight styles.
- [ ] Highlights at the first or last character render correctly.
- [ ] Adjacent highlights do not lose or duplicate text.
- [ ] Overlapping or invalid annotation ranges do not crash the Reader.
- [ ] The insight count equals the number of usable annotations.
- [ ] A long passage scrolls smoothly.
- [ ] Back navigation returns to the prior flow.

## 11. Vocabulary interaction

- [ ] Tapping a vocabulary highlight opens the vocabulary card.
- [ ] The correct term, part of speech, definition, and example appear.
- [ ] The card stays within the screen near left, right, top, and bottom edges.
- [ ] The pointer visually targets the selected word.
- [ ] Tapping outside closes the card.
- [ ] The close control closes the card.
- [ ] Opening several vocabulary highlights in succession always shows the selected term.

## 12. In-book and Real-world reference sheets

Run every item for both reference types.

- [ ] Tapping a reference opens the correct sheet and content.
- [ ] The quoted source text matches the selected highlight.
- [ ] The sheet slides up smoothly.
- [ ] Dragging downward from the handle, header, body, or any other point on the sheet moves it with the finger.
- [ ] A long drag or quick downward flick dismisses the sheet smoothly.
- [ ] A short, slow drag returns smoothly to the open position.
- [ ] Tapping the backdrop animates the sheet down before closing.
- [ ] The close button animates the sheet down before closing.
- [ ] Upward scrolling remains usable when sheet content is long.
- [ ] Repeated opening and closing does not produce jumps, stale content, or broken animation.

## 13. Empty analysis result

- [ ] A response with zero annotations still displays the complete passage as plain text.
- [ ] “No highlights found.” is visible.
- [ ] The screen does not appear broken or empty.
- [ ] Normal navigation remains available.

## 14. First-run highlight guide

- [ ] On a fresh install, the first successful Reader visit shows the guide.
- [ ] It explains Vocabulary, Real-world, and In-book highlights.
- [ ] Tapping the guide dismisses it.
- [ ] It does not reappear on another Reader visit.
- [ ] It remains dismissed after force-closing and reopening the app.
- [ ] It does not flash briefly before stored dismissal is read.
- [ ] Clearing app data or reinstalling makes it appear again.
- [ ] The book-title modal and highlight guide do not overlap.

## 15. Save and Library — when available

- [ ] Save creates one note under the correct book.
- [ ] Saving under an existing title does not create a duplicate book.
- [ ] Save shows progress and prevents duplicate taps.
- [ ] Success shows “Saved to Library” and changes the button to “Saved ✓.”
- [ ] Save failure shows an actionable message and permits retry.
- [ ] “Go to Library” opens Library.
- [ ] An empty Library shows its empty state and route back to capture.
- [ ] Books are listed alphabetically.
- [ ] Selecting a book shows its notes in chronological order.
- [ ] Note previews correspond to the correct passages.
- [ ] Reopening a note reproduces the original passage, highlights, and annotation content.
- [ ] Relaunching the app preserves saved notes.
- [ ] User A cannot see, edit, or delete User B’s books or notes.

## 16. Accessibility and usability

- [ ] All interactive controls have understandable VoiceOver/TalkBack labels.
- [ ] Focus order follows the visible interface.
- [ ] Retry, Back, modal dismissal, sheet dismissal, and highlighted text are operable with assistive technology.
- [ ] Large system text does not clip critical messages or buttons.
- [ ] Highlight meaning is not communicated by color alone.
- [ ] Text and controls remain readable in bright and dim surroundings.
- [ ] Touch targets are comfortably tappable.
- [ ] Loading states communicate progress without appearing frozen.
- [ ] No flow ends on a screen without a clear next action.

## 17. Reliability and performance

- [ ] Complete ten capture-to-Reader runs without a crash.
- [ ] Record capture-to-OCR and Analyze-to-Reader times for those ten runs.
- [ ] Repeat capture, retake, and back navigation rapidly without corrupting state.
- [ ] Switch between Wi-Fi and cellular during analysis and confirm safe recovery.
- [ ] Send the app to the background during OCR and analysis, then reopen it.
- [ ] Test with low-power mode enabled.
- [ ] Test with limited available storage if practical.
- [ ] Force-close from the camera, extracted-text, analyzing, Reader, and Library screens; relaunch safely.

## 18. Release smoke test

Before accepting a build:

- [ ] Fresh install.
- [ ] Sign in.
- [ ] Grant camera permission.
- [ ] Capture a real book passage.
- [ ] Review OCR text and add optional book context.
- [ ] Analyze successfully.
- [ ] Confirm or correct the book title if prompted.
- [ ] Open one vocabulary card.
- [ ] Open and drag-dismiss both reference-sheet types.
- [ ] Dismiss and verify persistence of the first-run guide.
- [ ] Exercise one OCR error and recover with Retake.
- [ ] Exercise one analysis error and recover with Retry.
- [ ] Save and reopen the passage from Library when those features are available.
- [ ] Force-close and relaunch; confirm session and persisted state remain correct.

## Final decision

- [ ] **Pass** — no release-blocking failures.
- [ ] **Conditional pass** — only documented, acceptable limitations remain.
- [ ] **Fail** — a core journey is blocked, data is incorrect, privacy is compromised, or the app crashes.

Release blockers found:

1.
2.
3.
