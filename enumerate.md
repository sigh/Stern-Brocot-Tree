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

<details>

  <summary>
  Given this mapping from $$ \mathbb{N}^+ \to \mathbb{Q}^+ $$ we can
  construct a mapping $$ \mathbb{N} \to \mathbb{Q} $$.
  </summary>

  For a bijective mapping $$ f(q): \mathbb{N}^+ \to \mathbb{Q}^+ $$, define
  $$ g(q): \mathbb{N} \to \mathbb{Q} $$ as:

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
* Without counting from the start, it's not easy to determine the index $$ n $$
  for a given rational $$ q $$ or vice-versa. It is difficult to compute
  how many fractions have been skipped over.

Let's do better.

# The Stern-Brocot Tree

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

<details>

  <summary>
  The elements are unique and appear in ascending order.
  </summary>

  All the fractions in the initial sequence
  $$ \left( \frac{0}{1}, \frac{1}{0} \right) $$ are unique and ordered.

  Given existing adjacent fractions $$ \frac{m}{n} $$ and $$ \frac{m'}{n'} $$:

  $$ \frac{m}{n} < \frac{m'}{n'} \implies mn' < nm' $$

  Every new fraction $$ \frac{m+m'}{n+n'} $$ is inserted in order, and is
  distinct from the existing elements because:

  $$ mn' < nm' \implies mn+mn' < nm+nm' \implies \frac{m}{n} < \frac{m+m'}{n+n'} $$

  $$ mn' < nm' \implies mn'+m'n' < m'n+m'n' \implies \frac{m+m'}{n+n'} < \frac{m'}{n'} $$

</details>

<details>

  <summary>
  Every element appears in its lowest form.
  </summary>

  First we show that for any adjacent fractions
  $$ \frac{m}{n} $$ and $$ \frac{m'}{n'} $$ that:

  $$ m'n − mn' = 1 $$

  This is true for the initial sequence
  $$ \left( \frac{0}{1}, \frac{1}{0} \right) $$: $$ 1 \times 1 - 0 \times 0 = 1 $$.

  Then whenever we insert a new fraction $$ \frac{m+m'}{n+n'} $$, this property
  holds for the two new pairs
  $$ \left( \frac{m}{n} , \frac{m+m'}{n+n'} \right) $$ and
  $$ \left( \frac{m+m'}{n+n'}, \frac{m'}{n'} \right) $$:

  $$ (m + m')n − m(n + n') = mn + m'n - mn - mn' = m'n - mn' = 1 $$

  $$ m'(n + n') - (m + m')n' = m'n + m'n' - mn' - m'n' = m'n - mn' = 1 $$

  This is sufficient to show that every fraction is in its lowest form.
  If we have a fraction $$ \frac{km}{kn} $$, then:

  $$ 1 = m'kn - kmn' = k(m'n - mn') \implies k = 1 $$

</details>

<details>

  <summary>
  Every positive rational number is present.
  </summary>

  Take any positive rational $$ \frac{a}{b} $$.
  Initially we have:

  $$ \frac{0}{1} < \frac{a}{b} < \frac{1}{0} $$

  Then, given $$ \frac{a}{b} $$ exists between adjacent elements
  $$ \frac{m}{n} < \frac{a}{b} < \frac{m'}{n'} $$ we compare
  $$ \frac{a}{b} $$ with the mediant $$ \frac{m+m'}{n+n'} $$:

  $$
   \begin{cases}
      \text{If } \frac{a}{b} = \frac{m+m'}{n+n'} \text{ we are done} \\
      \text{If } \frac{a}{b} < \frac{m+m'}{n+n'} \text{ replace }
        \frac{m'}{n'} \text{ with } \frac{m+m'}{n+n'} \\
      \text{If } \frac{a}{b} > \frac{m+m'}{n+n'} \text{ replace }
        \frac{m}{n} \text{ with } \frac{m+m'}{n+n'} \\
   \end{cases}
  $$

  To see that process must terminate:

  $$ \frac{m}{n} < \frac{a}{b} < \frac{m'}{n'} $$

  $$ \implies an-bm \ge 1 \text{ and } bm'-an' \ge 1 $$

  $$ \implies (m'+n')(an-bm) + (m+n)(bm'-an') \ge (m'+n') + (m+n) $$

  Combining this with the fact that $$ m'n − mn' = 1 $$ (proven above):

  $$
  \begin{eqnarray}
    & & (m'+n')(an-bm) + (m+n)(bm'-an') \\
    &=& m'an-m'bm+n'an-n'bm + mbm'-man'+nbm'-nan' \\
    &=& m'an-n'bm - man'+nbm' \\
    &=& (m'n−mn')(a+b) \\
    &=& a+b \\
  \end{eqnarray}
  $$

  $$ \implies a+b \ge m'+n' + m+n $$

  Since $$ m'+n' + m+n $$ increase at every step in the process, it must
  eventually equal to $$ a + b $$.

</details>

Thus the Stern-Brocot Tree is a binary search tree over all the positive
rationals!

# Indexing with Matrices

Each rational in tree can be uniquely identified by the path taken to reach
it in the tree. We will use:

* $$ L $$ to represent taking a left branch
* $$ R $$ to represent taking a right branch

For convenience we will also use:

* $$ I $$ to represent the empty path
* Exponents to represent runs of the same value. i.e.
  $$ X^n = \underbrace{XX \dots X}_{n} $$

For example
$$
  \frac{1}{1} \to I \quad
  \frac{2}{1} \to R \quad
  \frac{2}{5} \to LLR = L^2R \quad
  \frac{22}{7} \to RRRLLLLLL = R^3L^6
$$

This gives a bijection from the positive rationals to the finite strings made up
of $$ L $$ and $$ R $$: $$ \mathbb{Q}^+ \to \{L,R\}^* $$.

If we use $$ \{0,1\} $$ instead of $$ \{L,R\} $$,
then we have strings of binary digits.
Then prepending the strings with a $$ 1 $$ lets us interpret the strings as
natural numbers in binary. Using the same examples:

$$
  \frac{1}{1} \to I \to \color{grey}1\color{black}_2 = 1 \quad
  \frac{2}{1} \to R \to \color{grey}1\color{black}1_2 = 3 \quad
  \frac{2}{5} \to L^2R \to \color{grey}1\color{black}001_2 = 9 \quad
  \frac{22}{7} \to R^3L^6 \to \color{grey}1\color{black}111000000_2 = 960
$$

This is a bijection $$ \mathbb{Q}^+ \to \mathbb{N}^+ $$ which is equivalent to
traversing the Stern-Brocot tree layer by layer, i.e. a breath-first traversal.

TODO: demo

To concisely describe this process, define the matrices:

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

With these definitions, the path strings we created above are _equations_ to
generate a value in the tree!
Equivalently, we can think of the nodes of the tree being matrices themselves.

TODO: Prove

The concrete algorithm is:

<div class="columns">

  ```python
  def toNatural(q):
    S, n = I, 1

    while f(S) != q:
      if f(S) < q:
        S, n = S*L, n*2
      else:
        S, n = S*R, n*2+1

    return n
  ```

  ```python
  def toRational(n):
    S = I

    while n > 1:
      if n%2 == 0:
        S, n = S*L, n/2
      else:
        S, n = S*R, (n-1)/2

    return f(S)
  ```

</div>

We now have a nice bijection. We can iterate over all the rationals by
repeatedly evaluating `q = toRational(toNatural(q)+1)`.

However, this is not ideal -- let's see if we can iterate without having to
repeatedly fall back to the natural number representation.

# Optimizing with Euclid

<details>
  <summary>
  We can derive the following simple relationship in the path representation:

  $$
  \begin{eqnarray}
    \frac{a}{b} = f(RS) &\iff& \frac{a-b}{b} = f(S) \\
    \frac{a}{b} = f(LS) &\iff& \frac{a}{b-a} = f(S)
  \end{eqnarray}
  $$
  </summary>

  For any node in the tree $$ f(S) $$ we have:

  $$
  \begin{eqnarray}

    f(S)  &=& f\left(\begin{pmatrix} n & n' \\ m & m'\end{pmatrix}\right)
          &=& \frac{m+m'}{n+n'} \\

    f(RS) &=& f\left(\begin{pmatrix} n & n' \\ m+n & m'+n'\end{pmatrix}\right)
          = \frac{(m+n)+(m'+n')}{n+n'} &=& \frac{(m+m')+(n'+n')}{n+n'} \\

    f(LS) &=& f\left(\begin{pmatrix} m+n & m'+n' \\ m & m'\end{pmatrix}\right)
          = \frac{m+m'}{(m+n)+(m'+n')} &=& \frac{m+m'}{(m+m')+(n+n')}

  \end{eqnarray}
  $$

  Setting $$ a = m+m' $$ and $$ b = n+n' $$ proves the result.

</details>

Providing us with a simpler `toNatural` algorithm:

```python
def toNatural(q=a/b):
  n = 1

  while a != b:
    if a < b:
      b, n = b - a, n*2
    else:
      a, n = a - b, n*2+1

  return n
```

<details>
  <summary>
  We can optimize `toNatural` further by replacing the
  repeated subtractions with division.
  </summary>

  ```python
  def toNatural(q=a/b):
    n, rem, t = 1, 1, 1

    while rem:
      rem, v = a%b, a/b
      a, b = b, rem
      n, t = (n<<v) + ((t<<v)-t), 1-t

    return n>>1
  ```

   Notes:

   * The main loop is the Euclidean `gcd` algorithm.
   * `t` swaps between `0` and `1`. It starts at `1` because we start by assuming
     that `a  > b`.
   * `n<<v` $$ = n 2^v $$ shifts `n` to make room for `v` bits.
   * `(t<<v)-t` $$ = t(2^v-1) $$ creates a string of `t`s to add to the end
     of  `n`.
   * `n>>1` removes the last bit, as the algorithm goes one iteration too far.
     We want to stop when `a == b`, not when they reach `0`.

</details>

These are exactly the steps taken by
[Euclid's algorithm](https://en.wikipedia.org/wiki/Euclidean_algorithm) for
computing $$ \gcd(a, b) $$, which also highlights a direct connection between
the path and the
[continued fraction](https://en.wikipedia.org/wiki/Continued_fraction)
representation of the rational!

# Iterating

To iterate, we will construct a successor function $$ s'(S) $$ which can operate
on the matrix representation. The index of $$ s'(S) $$ in the natural number
representation should be one added to that of $$ S $$.

To do this we need to:

1. Detect when we are at the end of the layer, and move to the next one.
2. Find the successor for a node in the same layer.

First, case (1).

For the $$ n^{th} $$ layer
(where $$ \frac{1}{1} $$ is layer $$ 0 $$),
the first index is $$ 2^n \to L^n $$ and the last index is $$ 2^{n+1}-1 \to R^n $$.
We can prove by induction that:

$$

R^n = \begin{pmatrix} 1 & 0 \\ n & 1 \end{pmatrix}
\implies f(R^n) = n+1
$$

$$
L^n = \begin{pmatrix} 1 & n \\ 0 & 1 \end{pmatrix}
\implies f(L^n) = \frac{1}{n+1}
$$

This determines the behaviour at the end of a layer:
$$
  s\left(\begin{pmatrix} 1 & 0 \\ n & 1 \end{pmatrix}\right) =
    \begin{pmatrix} 1 & n+1 \\ 0 & 1 \end{pmatrix}
$$

(Note: It is sufficient to check that the top-right entry is zero to match
this case, since only the last entry is adjacent to $$ \frac{1}{0} $$.)

For case (2), note that to increment a number in binary, we increment the least
significant $$ 0 $$ digit, and set bits to the right to $$ 0 $$. For example:

$$
\color{grey}100\color{black}0_2 + 1_2 =  \color{grey}100\color{black}1_2 \quad
\color{grey}10\color{black}011_2 + 1_2 = \color{grey}10\color{black}100_2 \quad
            01111_2 + 1_2 =  10000_2 \quad
$$

In the path string this means finding the trailing $$ R $$s and
preceding $$ L $$, and transposing them:

$$
  s'(S)
  = s'(TLR^j)
  = TRL^j
$$ where $$ T $$ is an arbitrary prefix.

Next we can use the inverse matrices to replace the suffix of $$ S $$ to
obtain a equation for $$ s' $$:

$$
  s'(S)
  = T(LR^jR^{-j}L^{-1})RL^j
  = SR^{-j}L^{-1}RL^j
  = S \begin{pmatrix} 2j+1 & 1 \\ -1 & 0 \end{pmatrix}
$$

Now we need to determine $$ j $$. If we were after the leading $$ R $$s we
could take advantage of what we learnt from Euclid's algorithm above. With
a clever manipulation of matrices we can still use it to get:

<details>
  <summary>
  $$ S = \begin{pmatrix} n & n' \\ m & m' \end{pmatrix} \implies
     j = \left\lfloor \frac{n'+m'-1}{n+m} \right\rfloor  $$
  </summary>
  
  We can use the matrix transposition to reverse the path because
  $$ (AB)^T = B^T A^T $$ for any matrix. Thus:
  
  $$ S^T = (PLR^j)^T = R^{Tj}L^TP^T $$
  
  Then:
  
  $$
  R^T = L \text{ and } L^T = R \text{ by inspection}
  $$
  
  $$
  \implies S^T = L^jRP^T
  $$
  
  $$
  \implies
  f(S^T) = f(L^jRP^T) = f\left(\begin{pmatrix} n & m \\ n' & m' \end{pmatrix}\right)
  = \frac{n'+m'}{n+m}
  $$
  
  Because $$ R $$ and $$ L $$ are transposes, $$ S^T $$ represents a valid path,
  and thus $$ q = \frac{n'+m'}{n+m} $$ is a valid rational in the tree.
  This allows us to determine $$ j $$ by finding the number of _leading_ $$ L $$s
  in the path representation of $$ q $$.
  
  Given our algorithm above, this is the number of times we can subtract
  $$ n+m $$ from $$ n'+m' $$ without reaching $$ 0 $$, thus:
  
  $$ j = \left\lfloor \frac{n'+m'-1}{n+m} \right\rfloor  $$
  
</details>

Putting it all together we have:

$$

s'(S) = s'\left(\begin{pmatrix} n & n' \\ m & m' \end{pmatrix}\right)
=
\begin{cases}
  \begin{pmatrix} 1 & m+2 \\ 0 & 1 \end{pmatrix}    & n' = 0   \\
  S\begin{pmatrix} 2j+1 & 1 \\ -1 & 0 \end{pmatrix} & n' \ne 0 \\
\end{cases}
$$

TODO: Demo

We can now iterate over the rationals without having to run the Euclidean
algorithm each time! However, we need to carry around extra state $$ S $$,
because we can't recover the state directly from a given rational.

Let's do better.

# Calkin-Wilf Tree

Given the path representation of a rational number, let's instead interpret the
path in _reverse_. This new tree still contains all the rationals, but with the
numbers permuted within each layer:

This is the [Calkin-Wilf tree](https://en.wikipedia.org/wiki/Calkin%E2%80%93Wilf_tree).

<div>
  <canvas id='calkin-wilf-demo' width="500" height="400">
    Your browser does not support canvas.
  </canvas>
</div>

The most obvious difference is that the numbers are no longer in order.
This is an unfortunate loss, but let's see what we get in return.

<details>
  <summary>
  How to we traverse the tree?
  The children of $$ \frac{a}{b} $$
  are simply $$ \frac{a}{a+b} $$ and $$ \frac{a+b}{b} $$.
  </summary>

  To reverse the list, we will pre-multiply instead of post-multiply:

  $$
    f(S)
    = f\left(
        \begin{pmatrix} n & n' \\ m & m' \end{pmatrix}
      \right)
    = \frac{m+m'}{n'+n}
    = \frac{a}{b}
  $$

  $$
    f(L^jS)
    = f\left(
        \begin{pmatrix} 1 & j \\ 0 & 1 \end{pmatrix}
        \begin{pmatrix} n & n' \\ m & m' \end{pmatrix}
      \right)
    = \frac{m+m'}{n+jm+n'+jm'}
    = \frac{a}{ja+b}
  $$

  $$
    f(R^jS)
    = f\left(
        \begin{pmatrix} 1 & 0 \\ j & 1 \end{pmatrix}
        \begin{pmatrix} n & n' \\ m & m' \end{pmatrix}
      \right)
    = \frac{jn+m+jn'+m'}{n+n'}
    = \frac{a+jb}{b}
  $$

</details>

Now let's define the successor function as
$$ s(q) = s(\frac{a}{b}) = s(f(S)) $$.
We will calculate $$ s $$ in two parts:

<details>
  <summary>
  1\. Detect when we are at the end of the layer, and move to the next one.

  This is the case where $$ q $$ is an integer:
  $$ s(q) = s(\frac{a}{1}) = \frac{1}{q+1} $$
  </summary>

  The outer nodes $$ L^j $$ and $$ R^j $$ are the same as in the
  Stern-Brocot tree, because the reversed path is the same. Hence it is
  sufficient to detect when $$ q $$ is an integer.
</details>

<details>

  <summary>
  2\. Find the successor for a node in the same layer:
  $$ s(q) = \frac{1}{2 \lfloor q \rfloor + 1 - q} $$
  </summary>

  Since the path is reversed, we want care about the prefix of the string.
  Otherwise the reasoning is the same as for the Stern-Brocot tree:

  $$
    s(f(S))
     = s(f(R^jLT))
     = f(L^jRT)
  $$

  Define $$ f(T) = \frac{c}{d} $$. We can easily compute the following:

  $$
  \begin{eqnarray}
    f(R^jLT) &=& \frac{c+j(c+d)}{c+d} \\
    f(L^jRT) &=& \frac{c+d}{j(c+d)+d} \\
  \end{eqnarray}
  $$

  Thus:

  $$ q = \frac{a}{b} = f(S) = \frac{c+j(c+d)}{c+d} $$

  We can now find the values of $$c, d \text{ and } j $$:

  $$
  \begin{eqnarray}
    b &=& c+d \text{ and } a = c+j(c+d) \\
    j &=& \frac{a-c}{c+d} = \frac{a}{b} - \frac{c}{c+d}
          \implies
          j = \left\lfloor j \right\rfloor
            = \left\lfloor \frac{a}{b} \right\rfloor
            = \lfloor q \rfloor \\
    c &=& a-j(c+d) = a - \lfloor q \rfloor b \\
    d &=& b - c = b - a + \lfloor q \rfloor b
  \end{eqnarray}
  $$

  This lets us determine $$ s(q) $$ for this case:

  $$

  \begin{eqnarray}
    s(q) &=& s(L^jRT) = \frac{c+d}{j(c+d)+d} \\
          &=& \frac{b}{jb+d} \\
          &=& \frac{b}{\lfloor q \rfloor b + b - a + \lfloor q \rfloor b} \\
          &=& \frac{b}{2 \lfloor q \rfloor b + b - a} \\
          &=& \frac{1}{2 \lfloor q \rfloor + 1 - q} \\
  \end{eqnarray}
  $$

</details>

<details>
  <summary>
  However, the two cases can be combined into one.
  </summary>

  For case (1), $$ q $$ is an integer hence:

  $$
    q = \lfloor q \rfloor \implies
    \frac{1}{q+1} = \frac{1}{2 \lfloor q \rfloor + 1 - q}
  $$

</details>

Giving us a final, simple formula for iterating through the rationals:

$$
  s(q) = \frac{1}{2 \lfloor q \rfloor + 1 - q}
$$

TODO: Hide long parts of the proof (both this section and previous).

TODO: Demo

# Sources

Graham, Ronald L., Knuth, Donald E., & Patashnik, Oren. (1994). _Concrete
mathematics: A foundation for computer science_, Second edn. Addison-Wesley.

Calkin, Neil; Wilf, Herbert (2000), _Recounting the rationals_, American
Mathematical Monthly, Mathematical Association of America

Roland Backhouse and J&otilde;ao Ferreira.
_"Recounting the rationals" twice!_
Proceedings of the 9th international conference on Mathematics of Program Construction,
pages 79–91, 2008.

Bruce Bates, Martin Bunder, Keith Tognetti.
_Linking the Calkin–Wilf and Stern–Brocot trees_,
European Journal of Combinatorics,
Volume 31, Issue 7,
2010,
Pages 1637-1661,
ISSN 0195-6698.
