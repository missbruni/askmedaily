# AskMeDaily

A fun app generating random questions. Why not break the ice of your daily meeting with a daily funny question ?
Create an account, and make your own contribution of questions that get shuffled daily by many users.

## AI Question Suggestions

Signed-in users can choose **Generate with AI** in the question manager, enter an
optional topic, and request 5, 10, or 20 icebreakers. Suggestions are editable and
can be deselected before **Add selected** saves them to the existing collection
and shared question pool. Generation alone never creates question documents.
The play screen does not call Gemini.

Set these environment variables on the server (never in browser code):

- `GEMINI_API_KEY`: a Gemini Developer API key from Google AI Studio.
- `GEMINI_MODEL`: optional model ID; defaults to `gemini-2.5-flash`. Check Google's
  current model availability and pricing before enabling it.
- `GEMINI_DAILY_REQUEST_LIMIT`: optional app-wide request cap, default `20`
  (valid range: 1-1000).

Without a key, the generation page explains that AI is unavailable. Manual entry,
CSV import, and playing existing questions keep working.

Only the topic and generation instructions are sent to Gemini, not user identity
or existing questions. Do not include personal or confidential information.
Review suggestions for appropriateness and accuracy; AI safety instructions
and Gemini's filtering are not a substitute for human review.

Requests use a shared Firestore transaction to enforce a one-minute cooldown and
five requests per user per UTC day, plus the app-wide daily cap. The
`questionGenerationLimits` collection keeps one document per generating user and
one shared document. Each quota reservation reads two limit documents and writes
two, including failed provider requests; transaction retries can add reads.
Firestore security rules should deny client access to this server-managed collection.
Duplicate checks also read the user's collection. Generation is never retried automatically.
These app limits do not guarantee provider free-tier eligibility or prevent
billing if a paid project is configured. Gemini's own limits still apply.

Duplicate wording is normalized for case, whitespace, and Unicode and checked
within a batch and against the current user's collection, both before preview
and again before saving. Questions belonging to other users and paraphrases are
not deduplicated. Concurrent saves can still race; this is not a global uniqueness
constraint.

## Question progress

Each browser gets a personal shuffled order. Swiping a card saves a small,
signed, HTTP-only cookie; refreshing resumes at the next unswiped card. A batch
contains up to five questions, and the last batch of a round can be shorter.
After every available question has been consumed, a fresh round starts. With
more than one question, the new round never immediately repeats the last card.

Progress uses the existing cached question IDs and adds no Firestore reads or
writes per swipe. Stable ranks keep additions and deletions from repeating
consumed questions within a round. Newly added questions behind the bookmark
wait until the next round.

The progress cookie is separate from login and lasts for one year after the
latest visit or swipe. Progress is per browser, not synced across devices or
accounts. Clearing cookies starts a new deck. Simultaneous tabs can show the same
cards; cookie-only storage does not coordinate independent browsing sessions.
An unswiped card may be shown again after a refresh. Failed saves show a retry
control, and the next batch waits for the last swipe to be saved.
