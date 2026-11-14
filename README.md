# Goldlist

A local-first web app for building vocabulary with the GoldList method.

![goldlist banner](./misc/aurum-baner.jpg)

## About method

GoldList is a low-effort vocabulary-learning technique popularized by David James.
A learner writes a short list of words or phrases (a "headlist", typically around
20 items) together with their meanings, then sets it aside. After a rest period of
roughly two weeks, the learner performs a "distillation": they test themselves on
each item and copy only the ones they could not recall into a new, shorter list.
The cycle repeats at spaced intervals, and every pass strips away remembered items
until only a small "gold list" of stubborn words remains. The method deliberately
avoids cramming: the rest periods, the act of writing, and the gradual narrowing
are meant to let long-term memory do the work.

The method is not a formally validated protocol, but its mechanics align with
robust findings in cognitive psychology. Spacing study over time yields far better
long-term retention than massing it together (the spacing effect; see Ebbinghaus's
forgetting curve and Cepeda et al.'s 2006 meta-analysis). Retrieving information
from memory strengthens it more than rereading (the testing effect; Roediger &
Karpicke, 2006). Concentrating later study on the items that were not recalled
resembles corrective restudy after retrieval practice, and the increasing intervals
approximate expanding retrieval schedules — the "desirable difficulties" that make
learning effortful but durable (Bjork & Bjork, 2011).

Our app digitizes this workflow while preserving its low-friction, local-first
spirit: words are captured as they are encountered, spaced distillations are
scheduled automatically, and all data stays in the browser. Because the specific
GoldList protocol has little direct experimental evidence, the app treats it as a
practical heuristic built on well-established spacing and retrieval principles
rather than a proven optimal method. Its goal is to make consistent, low-stress
practice easy enough to sustain.
