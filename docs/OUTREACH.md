# Outreach: taking Vaada to the people already doing this work

Not part of the site. This file is a working document for you, deliberately
kept out of `src/` so nothing here ever ships.

Last updated: 21 August 2026.

---

## 1. First, an honest note on the research

**I could not scrape X.** Anonymous requests to X return HTTP 402 — it is the
gotcha already recorded in `docs/PROJECT-NOTES.md`, and it is why `/submit`
exists as a paste flow in the first place. Everything below comes from
published reporting, not from reading their timeline.

**Verify every handle before you send anything.** I have the names of the
people from reporting; I do not have their verified `@`s, and tagging the wrong
account is both embarrassing and the fastest way to look like a bot. Look each
one up first.

---

## 2. Why CJP is the right target, specifically

The Cockroach Janta Party was founded on **16 May 2026** by **Abhijeet Dipke**,
a political communications strategist formerly with AAP. It is a pressure
group, not an electoral outfit. It forced the resignation of education minister
**Dharmendra Pradhan on 25 July 2026**, after which the PM announced an exam
task force under Nandan Nilekani.

Their next campaign is the one that matters to you.

**"Fix the Schools" / "School Thik Karo", launched 15 August 2026.** CJP asked
supporters to visit their nearest government school and audit it against a
four-point checklist:

1. Drinking water and functional toilets
2. Electricity and usable classrooms
3. Boundary walls and campus safety
4. Midday meals and teacher attendance

Al Jazeera describes the method as leveraging social media to *"outsource the
grassroots work to followers"* — volunteers inspecting schools without any
formal organisational infrastructure.

### The gap, stated plainly

**Thousands of citizen audits are producing verbal promises from officials, and
there is no system anywhere tracking whether those promises are kept.**

That is not a pitch. That is a description of the hole in their campaign, and
it is the exact shape of what you built. Their checklist maps onto your
categories almost one-to-one: water and sanitation, infrastructure, safety,
education.

There is a second detail worth knowing. After a sit-in in **Rajasthan** where
*"officials accepted the demands"* on rooms, toilets and drinking water, the
state government **restricted outsiders from entering government schools and
banned photos and videos**. That is a direct attack on the evidence model — and
it is the strongest argument for a register that archives sources so they
survive both deletion and a camera ban.

### People to look up

Founder: **Abhijeet Dipke**. Spokespersons named in reporting: **Saurav Das,
Ashutosh Ranka, Vaishnavi Gaur, Aafreen Nawaz, Deepak Baliyan, Ratna Singh**.
Website: cockroachjantaparty.org.

Adjacent accounts worth researching rather than blasting: Factly, IndiaSpend,
Article 14, Scroll.in, The Print, Khabar Lahariya, Pratham / ASER (they publish
the annual education status report), Accountability Initiative at CPR, Janaagraha.

---

## 3. Before you post anything

- [ ] Site is deployed and the link works on mobile data, not just localhost
- [ ] `/method` reads clearly — it is the page a sceptic opens second
- [ ] Take **three screenshots**: the map, one promise page with its countdown
      and receipt, and the submit form showing the mandatory-proof gate
- [ ] Your X profile has a photo, a bio and a pinned post. An egg account
      tagging a movement gets ignored or reported
- [ ] Have the GitHub link ready — open source is your credibility, use it

**On screenshots:** show a promise that is *kept* as well as one that is broken.
A tracker that only shows failures reads as partisan. Showing a green one proves
you are running a record, not a campaign.

---

## 4. The launch post

Lead with their campaign, not your project. Nobody cares about your website;
they care about their own work.

> 🏫 @CJP's #FixTheSchools has volunteers auditing schools across India.
>
> Officials are responding with promises. "Repairs in a week." "Rooms in three
> months."
>
> Nobody is tracking whether those promises are kept.
>
> So I built the thing that does. 🧵

Then the thread:

> 2/ Vaada is a public register of government promises.
>
> One row per promise. The deadline is the one **the official chose
> themselves** — not one we invented.
>
> A clock runs. ⏳

> 3/ When a deadline passes with no verified proof of completion, the entry
> turns red.
>
> Note the wording. It is a claim about evidence, not about a person. That
> distinction is the whole reason this can exist. 🔴

> 4/ Progress only moves when a citizen submits proof and a human accepts it.
>
> An official announcing the work is done moves **nothing**. 📸

> 5/ The bit I care about most:
>
> A promise with no deadline is recorded as "undated" rather than dropped.
>
> A promise with no deadline can never be broken — which is exactly why it
> gets given. 🤔

> 6/ Anyone can log one. Paste the post, attach proof, done.
>
> No account. No password. No email. Proof is mandatory — without something
> checkable it is an allegation against a named person, and this register does
> not carry those. ✅

> 7/ Free, open source, no ads, no tracking, nothing to sell.
>
> 🔗 [your URL]
> 💻 github.com/maheepatel/Vaada
>
> If you are auditing a school this week, log what they promised you.
> #FixTheSchools

---

## 5. The reply-to-CJP version

Shorter, aimed at a specific post of theirs about a school audit. Replies get
seen more than cold posts do.

> This is exactly the kind of promise that gets forgotten once the cameras
> leave. 📉
>
> I built a public register that keeps the clock running on them — deadline the
> official set, evidence from citizens, nothing published without a human
> checking the source.
>
> Free & open source: [URL]
>
> Would be glad to add this one. 🏫

## 6. The reply-to-a-news-story version

> They said "within one week." Worth writing that down somewhere it cannot
> quietly disappear. ⏳
>
> [URL] — public register, live countdown, citizen evidence. Every entry traces
> back to a published source.

## 7. The Rajasthan camera-ban angle

Use this one only when it is topical. It is your sharpest argument.

> Rajasthan restricted outsiders from entering government schools and banned
> photos and videos — right after officials accepted demands at a sit-in. 📵
>
> Which is exactly why a promise register archives its sources.
>
> You cannot un-say something that was already written down. 🗄️

---

## 8. Hashtags

Lead with **#FixTheSchools** — it is theirs, it is live, and it is where the
audience already is.

Core: `#FixTheSchools` `#SchoolThikKaro` `#CJP`
Accountability: `#RightToEducation` `#RTE` `#GovernmentAccountability` `#JawabDo`
Reach: `#India` `#EdTech` `#CivicTech` `#OpenSource`

**Three or four per post, maximum.** More than that reads as spam and X
suppresses it. Put them at the end, never mid-sentence.

---

## 9. Rules that will keep you out of trouble

**Never claim an official failed.** Say *"the deadline passed with no verified
proof of completion."* You are naming real people. That phrasing is the
difference between a public record and a defamation suit, and it is already the
rule everywhere in the codebase.

**Do not tag the officials themselves.** Not yet. That converts a record into a
confrontation and it will be the thing people remember instead of the tool.

**Do not mass-tag.** Two or three accounts per post. Ten is a report button.

**Lead with their work, not yours.** Every draft above does this on purpose.

**Expect the "who are you" question.** Have an answer: it is open source, every
entry cites a published source, nothing is published without human review, and
anyone can check the code.

---

## 10. Sensible sequence

1. Deploy. Nothing below works with a localhost link.
2. Post the thread from your own account. Tag nobody. Get it stable.
3. Reply to two or three live #FixTheSchools posts about specific schools. Be
   useful, not promotional.
4. Once you have a handful of real user-submitted entries, *then* approach CJP
   directly — with evidence it works rather than a promise that it will.
5. Journalists last. They want a story, and "citizens built the accountability
   layer the government did not" is one, but only once there is data behind it.

**Step 4 matters most.** An empty register tagged at a movement is a favour
request. A register with fifty citizen-logged promises from their own campaign
is a contribution to it.

---

## Sources

- [What the CJP protests reveal about India's next generation — Al Jazeera](https://www.aljazeera.com/opinions/2026/8/6/what-the-cjp-protests-reveal-about-indias-next-generation)
- [India's 'Cockroach' movement makes schools next battleground — Al Jazeera](https://www.aljazeera.com/features/2026/8/18/indias-cockroach-movement-makes-schools-next-battleground-against-modi)
- [Indian student protests: what's next after Modi's promise on exam leaks — Al Jazeera](https://www.aljazeera.com/news/2026/7/24/indian-student-protests-whats-next-after-modis-promise-on-exam-leaks)
- [Cockroach Janta Party — Wikipedia](https://en.wikipedia.org/wiki/Cockroach_Janta_Party)
- [2026 Delhi Jantar Mantar protests — Wikipedia](https://en.wikipedia.org/wiki/2026_Delhi_Jantar_Mantar_protests)
- [India's CJP plans national movement — Taipei Times](https://www.taipeitimes.com/News/world/archives/2026/08/02/2003861811)
- [CJP Protest Timeline 2026](https://www.delhistudentprotest.com/timeline)
