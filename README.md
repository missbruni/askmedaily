# AskMeDaily

A fun app generating random questions. Why not break the ice of your daily meeting with a daily funny question ?
Create an account, and make your own contribution of questions that get shuffled daily by many users.

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
