---
layout: default
title: Enumerating the Rationals with Stern-Brocot Trees
---

The rational numbers ($$ \mathbb{Q} $$) are [countable](https://en.wikipedia.org/wiki/Countable_set),
meaning that we can match them up, one-to-one, with the natural
numbers ($$ \mathbb{N} $$).

A common demonstration of this is to create a grid of the positive rational
numbers ($$ \mathbb{Q}^+ $$), with the rows having every possible numberator
and the columns having every possible denominator.
Then we can iterate over the grid such that we eventually reach each number.

TODO: Insert demo

<details>

  <summary>
    Given this mapping from \( \mathbb{N}^+ \to \mathbb{Q}^+ \) we can
    construct a mapping \( \mathbb{N} \to \mathbb{Q} \).
  </summary>

  For a bijective mapping \( f(q): \mathbb{N}^+ \to \mathbb{Q}^+ \), define
  \( g(q): \mathbb{N} \to \mathbb{Q} \) as:

  $$
    g(n) =
    \begin{cases}
      0                 & \text{ for } n = 0 \\
      f(\frac{n}{2})    & \text{ for } n = 0 \mod{2} \\
      -f(\frac{n+1}{2}) & \text{ for } n= 1 \mod{2} \\
    \end{cases}
  $$

  The first few elements of \(g\) are:

  $$
    0,
    \frac{1}{1},
    -\frac{1}{1},
    \frac{1}{2},
    -\frac{1}{2},
    \frac{2}{1},
    -\frac{2}{1},
    \dots
  $$

</details>

However, this mapping is not ideal:

* The grid, by itself, has many duplicates because each rational
$$ \frac{a}{b} $$ appears an infinite number of times as $$ \frac{ka}{kb} $$.
These must be detected and skipped over.

* Even detecting whether we should skip a fraction can be expensive. We must
  determine if $$ gcd(a,b) = 1 $$.

* It's not easy to determine the index $$ n $$ for a given rational $$ q $$
or vice-versa, without counting from the start. That is, we don't have an
efficient algorithm for computing the mapping because it is difficult to compute
how many fractions have been skipped over.

Let's do better.
