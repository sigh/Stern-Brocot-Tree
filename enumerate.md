---
layout: default
title: Enumerating the Rationals with Stern-Brocot Trees
---

# A grid of Rationals

The rational numbers ($$ \mathbb{Q} $$) are [countable](https://en.wikipedia.org/wiki/Countable_set),
meaning that we can match them up, one-to-one, with the natural
numbers ($$ \mathbb{N} $$).

A common way to show this is to create a grid of the positive rational
numbers ($$ \mathbb{Q}^+ $$), with the rows having every numerator
and the columns having every denominator.
Then we can iterate over the grid such that we eventually reach each number.

TODO: Insert demo

>  Given this mapping from $$ \mathbb{N}^+ \to \mathbb{Q}^+ $$ we can
>  construct a mapping $$ \mathbb{N} \to \mathbb{Q} $$.
>
>  For a bijective mapping $$ f(q): \mathbb{N}^+ \to \mathbb{Q}^+ $$, define
>  $$ g(q): \mathbb{N} \to \mathbb{Q} $$ as:
>
>  $$
>    g(n) =
>    \begin{cases}
>      0                 & \text{ for } n = 0 \\
>      f(\frac{n}{2})    & \text{ for } n = 0 \mod{2} \\
>      -f(\frac{n+1}{2}) & \text{ for } n= 1 \mod{2} \\
>    \end{cases}
>  $$
>
>  The first few elements of \(g\) are:
>
>  $$
>    0,
>    \frac{1}{1},
>    -\frac{1}{1},
>    \frac{1}{2},
>    -\frac{1}{2},
>    \frac{2}{1},
>    -\frac{2}{1},
>    \dots
>  $$

However, this mapping is not ideal:

* The grid, by itself, has many duplicates because each rational
$$ \frac{a}{b} $$ appears an infinite number of times as $$ \frac{ka}{kb} $$.
These must be detected and skipped over.

* Even detecting whether we should skip a fraction can be expensive. We must
  determine if $$ gcd(a,b) = 1 $$.

* Without counting from the start, it's not easy to determine the index $$ n $$
  for a given rational $$ q $$ or vice-versa. It is difficult to compute
  how many fractions have been skipped over.

Let's do better.

# Stern-Brocot Tree

The [Stern-Brocot Tree](https://en.wikipedia.org/wiki/Stern%E2%80%93Brocot_tree)
is a structure which contains all the positive rationals uniquely, in their
lowest form.

Start with the sequence of fractions: $$ \left( \frac{0}{1}, \frac{1}{0} \right) $$.

Then expand the sequence by inserting the fraction
$$ \frac{m+m'}{n+n'} $$ (called the mediant)
between any two adjacent fractions
$$ ( \dots \frac{m}{n}, \frac{m'}{n'} \dots ) $$:

$$
  \left( \frac{0}{1}, \frac{1}{0} \right)

  \longrightarrow

  \left( \color{grey}
    \frac{0}{1},\color{black} \frac{1}{1} \color{grey}, \frac{1}{0}
  \color{black} \right)

  \longrightarrow

  \left( \color{grey}
    \frac{0}{1}, \color{black}\frac{1}{2}\color{grey}, \frac{1}{1}, \color{black}\frac{2}{1}\color{grey}, \frac{1}{0}
  \color{black} \right)

  \longrightarrow \dots
$$

This sequence can be arranged into a binary tree with fractions
$$ \frac{m+m'}{n+n'} $$ where $$ \frac{m}{n} $$ is it's nearest ancestor to
the left, and $$ \frac{m'}{n'} $$ is it's nearest ancestor to the right.

<div>
  <canvas id='stern-brocot-demo' width="500" height="400">
    Your browser does not support canvas.
  </canvas>
</div>

This gives us several nice properties:

>  The elements are unique and appear in ascending order.
>
>  All the fractions in the initial sequence
>  $$ \left( \frac{0}{1}, \frac{1}{0} \right) $$ are unique and ordered.
>
>  Given existing adjacent fractions $$ \frac{m}{n} $$ and $$ \frac{m'}{n'} $$:
>
>  $$ \frac{m}{n} < \frac{m'}{n'} \implies mn' < nm' $$
>
>  Every new fraction $$ \frac{m+m'}{n+n'} $$ is inserted in order, and is
>  distict from the existing elements because:
>
>  $$ mn' < nm' \implies mn+mn' < nm+nm' \implies \frac{m}{n} < \frac{m+m'}{n+n'} $$
>
>  $$ mn' < nm' \implies mn'+m'n' < m'n+m'n' \implies \frac{m+m'}{n+n'} < \frac{m'}{n'} $$

> Every element appears in its lowest form.
>
> First we show that for any adjacent fractions
> $$ \frac{m}{n} $$ and $$ \frac{m'}{n'} $$ that:
>
> $$ m'n − mn' = 1 $$
>
> This is true for the initial sequence
> $$ \left( \frac{0}{1}, \frac{1}{0} \right) $$: $$ 1 \times 1 - 0 \times 0 = 1 $$.
>
> Then whenever we insert a new fraction $$ \frac{m+m'}{n+n'} $$, this property
> holds for the two new pairs
> $$ \left( \frac{m}{n} , \frac{m+m'}{n+n'} \right) $$ and
> $$ \left( \frac{m+m'}{n+n'}, \frac{m'}{n'} \right) $$:
>
> $$ (m + m')n − m(n + n') = mn + m'n - mn - mn' = m'n - mn' = 1 $$
>
> $$ m'(n + n') - (m + m')n' = m'n + m'n' - mn' - m'n' = m'n - mn' = 1 $$
>
> This is sufficient to show that every fraction is in its lowest form.
> If we have a fraction $$ \frac{km}{kn} $$, then:
>
> $$ 1 = m'kn - kmn' = k(m'n - mn') \implies k = 1 $$

> Every positive rational number is present.
>
> Take any positive rational $$ \frac{a}{b} $$.
> Initially we have:
>
> $$ \frac{0}{1} < \frac{a}{b} < \frac{1}{0} $$
>
> Then, given $$ \frac{a}{b} $$ exists between adjacent elements
> $$ \frac{m}{n} < \frac{a}{b} < \frac{m'}{n'} $$ we compare
> $$ \frac{a}{b} $$ with the mediant $$ \frac{m+m'}{n+n'} $$:
>
> $$
>  \begin{cases}
>     \text{If } \frac{a}{b} = \frac{m+m'}{n+n'} \text{ we are done} \\
>     \text{If } \frac{a}{b} < \frac{m+m'}{n+n'} \text{ replace }
>       \frac{m'}{n'} \text{ with } \frac{m+m'}{n+n'} \\
>     \text{If } \frac{a}{b} > \frac{m+m'}{n+n'} \text{ replace }
>       \frac{m}{n} \text{ with } \frac{m+m'}{n+n'} \\
>  \end{cases}
> $$
>
> To see that process must terminate:
>
> $$ \frac{m}{n} < \frac{a}{b} < \frac{m'}{n'} $$
>
> $$ \implies an-bm \ge 1 \text{ and } bm'-an' \ge 1 $$
>
> $$ \implies (m'+n')(an-bm) + (m+n)(bm'-an') \ge (m'+n') + (m+n) $$
>
> Combining this with the fact that $$ m'n − mn' = 1 $$ (proven above):
>
> $$
> \begin{eqnarray}
>   & & (m'+n')(an-bm) + (m+n)(bm'-an') \\
>   &=& m'an-m'bm+n'an-n'bm + mbm'-man'+nbm'-nan' \\
>   &=& m'an-n'bm - man'+nbm' \\
>   &=& (m'n−mn')(a+b) \\
>   &=& a+b \\
> \end{eqnarray}
> $$
>
> $$ \implies a+b \ge m'+n' + m+n $$
>
> Since $$ m'+n' + m+n $$ increase at every step in the process, it must
> eventually equal to $$ a + b $$.

Thus the Stern-Brocot Tree is a binary search tree over all the positive=
rationals!

# Mapping to the Naturals

Each rational in tree can be uniquely identified by the path taken to reach
it in the tree. We will use:

* $$ L $$ to represent taking a left branch
* $$ R $$ to represent taking a right branch

For convinience we will also use:

* $$ I $$ to represent the empty path
* Exponents to represent runs of the same value. i.e.
  $$ X^n = \underbrace{XX \dots X}_{n} $$

For example
$$
  \frac{1}{1} = I \quad
  \frac{2}{1} = R \quad
  \frac{2}{5} = LLR = L^2R \quad
  \frac{22}{7} = RRRLLLLLL = R^3L^6
$$

This gives a bijection from the positive rationals to the finite strings made up
of $$ L $$ and $$ R $$: $$ \mathbb{Q}^+ \to \{L,R\}^* $$.

If we use $$ \{0,1\} $$ instead of $$ \{L,R\} $$,
then we have strings of binary digits.
Then prepending the strings with a $$ 1 $$ lets us interpret the strings as
natural numbers in binary. Using the same examples:

$$
  \frac{1}{1} = I \to \color{grey}1\color{black}_2 = 1 \quad
  \frac{2}{1} = R \to \color{grey}1\color{black}1_2 = 3 \quad
  \frac{2}{5} = L^2R \to \color{grey}1\color{black}001_2 = 9 \quad
  \frac{22}{7} = R^3L^6 \to \color{grey}1\color{black}111000000_2 = 960
$$

This is a bijection $$ \mathbb{Q}^+ \to \mathbb{N}^+ $$ which is equivalent to
traversing the Stern-Brocot tree layer by layer, i.e. a breath-first traversal.

TODO: demo

To consisely describe this process, define the matricies:

$$
  I = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}
  \quad
  L = \begin{pmatrix} 1 & 1 \\ 0 & 1 \end{pmatrix}
  \quad
  R = \begin{pmatrix} 1 & 0 \\ 1 & 1 \end{pmatrix}
$$

Define the function $$ f $$ to turn a matrix into a rational number:

$$
  f\left(\begin{pmatrix} n & n' \\ m & m'\end{pmatrix}\right) = \frac{m+m'}{n+n'}
$$

Now the path strings we created above are _equations_ to generate a
value in the tree!

TODO: Prove

The concrete algorithm is:

```python
def toNatural(q):
  s = I
  n = 1

  while f(s) != q:
    if f(s) < q:
      s = s*L
      n = n*2
    else:
      s = s*R
      n = n*2+1

  return n
```

```python
def toRational(n):
  s = I

  while n > 1:
    if n%2 == 0:
      s = s*L
      n = n/2
    else:
      s = s*R
      n = (n-1)/2

  return f(s)
```

# Sources

Graham, Ronald L., Knuth, Donald E., & Patashnik, Oren. (1994). _Concrete
mathematics: A foundation for computer science._ Second edn. Addison-Wesley.

Calkin, Neil; Wilf, Herbert (2000), "Recounting the rationals", _American
Mathematical Monthly, Mathematical Association of America_
