# 9. Voice

NCode writes the way one engineer tells another exactly what a thing does, in the order they need it, and what it
costs. The same voice runs through a README, a decision record, an error message and a landing page.

## How NCode Writes

1. **Say what it does, with the mechanism, in the first sentence.** "Pinned, pooled .NET buffers that zero themselves
   on dispose, for keys and other secrets." No adjective in it is a claim: each is a property the code has.
2. **Give the reason in the same sentence as the rule.** "Never put it in a public issue: that tells attackers about
   it before a fix exists."
3. **Use exact numbers and names.** "128 by 128, the size NuGet recommends." "NCode Blue on a dark page is 2.1 to 1,
   too low to read: use the light mark or a tile there."
4. **State limits and costs as plainly as features.** "Nothing here is pinned or zeroed." "It starts no threads,
   performs no I/O and opens no network connection."
5. **Title a decision with the decision.** "A person merges every pull request." A heading is a sentence someone can
   disagree with.
6. **Address the reader as "you", in the imperative, in the present tense.** "Pick the row that matches your data."
7. **Tables for choices, prose for reasons.** Facts every row shares go in the sentence above the table.
8. **Be direct and civil about what was rejected.** Say why, once, without scorn.

## Do and Don't

| Do | Don't |
|---|---|
| "Each of these zeroes its memory on dispose." | "Enterprise-grade memory security you can trust." |
| "Report a vulnerability in NCode.Buffers privately." | "We take security very seriously." |
| "The mark sits at one of three sizes in its square." | "Our logo is carefully crafted to look great everywhere." |
| "A larger buffer gets its own pinned array, still zeroed on dispose." | "Seamlessly handles buffers of any size." |
| "Keep the lockup at least 24 pixels high." | "Please try to avoid making the logo too small!" |
| "The script runs on the Node.js release `.node-version` names, with no packages to install." | "Simply run our easy build script." |

- No superlatives and no unprovable adjectives: not "blazing", "robust", "seamless", "powerful", "best-in-class",
  "simply", "just" or "easy". If a property matters, state the measurement.
- No exclamation marks, no emoji and no rhetorical questions.
- Name the thing: the type, the file, the command, the size, the ratio, the decision record.
- Say what something does not do when a reader might assume it does.
- One idea per sentence, with a colon before the reason or the consequence. When a sentence needs a second colon,
  split it.

## In an Interface

- **A key says what it does**: "Create client", "Rotate secret". Sentence case, no ellipsis unless it opens a dialog
  that asks for more.
- **An error says what happened and what to do**: "The username or password is incorrect." Never "Oops".
- **A destructive action names its object and its consequence**: "Delete client billing-service. Tokens it holds stop
  working."
- **An empty state says what would be here and how to add it**: "No clients yet. Create one to request tokens."
- **A name is engraved, a value is displayed**: a narrow uppercase label names a part, and a monospace value is read off
  the system. Don't write a value in the label voice or a label in the value voice.

A product or landing page keeps the same voice. Its first line is the README's first line: what it is and the
property that matters. Proof, such as a number, a standard or a signed release, replaces praise.
