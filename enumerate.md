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

<div>
  <canvas id='grid-vis' width="300" height="300">
    Your browser does not support canvas.
  </canvas>
</div>

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

  \left(
    {\color{grey}\frac{0}{1},}
    \frac{1}{1}
    {\color{grey}, \frac{1}{0} }
  \right)

  \longrightarrow

  \left(
    {\color{grey} \frac{0}{1}, }
    \frac{1}{2}
    {\color{grey}, \frac{1}{1}, }
    \frac{2}{1}
    {\color{grey}, \frac{1}{0} }
  \right)

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
  \frac{1}{1} \to I \to {\color{grey}1}_2 = 1 \quad
  \frac{2}{1} \to R \to {\color{grey}1}1_2 = 3 \quad
  \frac{2}{5} \to L^2R \to {\color{grey}1}001_2 = 9 \quad
  \frac{22}{7} \to R^3L^6 \to {\color{grey}1}111000000_2 = 960
$$

This is a bijection $$ \mathbb{Q}^+ \to \mathbb{N}^+ $$ which is equivalent to
traversing the Stern-Brocot tree layer by layer, i.e. a breath-first traversal.

<div id="basic-mapping" class="iteration-tree-container">
  <div id="basic-mapping-iterator" class="iteration-container"></div>
  <canvas id="basic-mapping-tree" width="450" height="400">
    Your browser does not support canvas.
  </canvas>
</div>

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
  f\left(\begin{pmatrix} n & n' \\ m & m'\end{pmatrix}\right)
  = \frac{m+m'}{n+n'}
  = \frac{a}{b}
$$

<details>
  <summary>
  With these definitions, the path strings from above are _equations_ to generate a
  value in the tree!
  </summary>

  First we can verify that the empty path equals the root of the tree:
  $$ f(I) = \frac{0 + 1}{1 + 0} = \frac{1}{1} $$

  Then we verify that the left and right children of paths are correct.
  Let the path string for $$ \frac{a}{b} $$ be $$ S $$, i.e.
  $$ f(S) = \frac{a}{b} $$. By definition, $$ \frac{a}{b} $$ is the
  mediant of $$ \frac{m}{n} $$ and $$ \frac{m'}{n'} $$.

  To get the left child we append $$ L $$ to the path. This results in the
  mediant of $$ \frac{m}{n} $$ and $$ \frac{a}{b} $$:

  $$
    f(SL)
    = f\left(
        \begin{pmatrix} n & n' \\ m & m' \end{pmatrix}
        \begin{pmatrix} 1 & j \\ 0 & 1 \end{pmatrix}
      \right)
    = \frac{m+m+m'}{n+n+n'}
    = \frac{m+a}{n+b}
  $$

  To get the left child we append $$ R $$ to the path. This results in the
  mediant of $$ \frac{a}{b} $$ and $$ \frac{m'}{n'} $$:

  $$
    f(SR)
    = f\left(
        \begin{pmatrix} n & n' \\ m & m' \end{pmatrix}
        \begin{pmatrix} 1 & 0 \\ 1 & 1 \end{pmatrix}
      \right)
    = \frac{m+m'+m'}{n+n'+n'}
    = \frac{a+m'}{b+n'}
  $$

</details>

Equivalently, we can think of the nodes of the tree being matrices themselves.

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


# Optimizing with Euclid

We now have a nice bijection.

We can even iterate over all the rationals by
repeatedly evaluating `q = toRational(toNatural(q)+1)`, although that is a
bit cumbersome as we have to continually translate between representations.

However, before we find a better way of iterating, let's optimize this algorithm
a bit to uncover some deeper connections.

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

# Iterating the Matrix

To a find more direct method of iteration, we will construct a successor function
$$ s(S) $$ which can operate on the matrix representation.

To do this we need to:

<details>
  <summary>
  1\. Detect when we are at the end of the layer, and move to the next one.

  This involves knowing when $$ f(S) $$ is an integer $$ k-1 $$ and then going
  to $$ \frac{1}{k} $$:

  $$
    s\left(\begin{pmatrix} 1 & 0 \\ k & 1 \end{pmatrix}\right) =
      \begin{pmatrix} 1 & k+1 \\ 0 & 1 \end{pmatrix}
  $$
  </summary>

  For the $$ k^{th} $$ layer
  (where $$ \frac{1}{1} $$ is layer $$ 0 $$):

  * The first path is $$ L^k $$ with index $$ 2^k $$
  * The last path is $$ R^k $$ with index $$ 2^{k+1}-1 $$

  We can now show by induction that:

  $$

  R^k = \begin{pmatrix} 1 & 0 \\ k & 1 \end{pmatrix}
  \implies f(R^k) = k+1
  $$

  $$
  L^k = \begin{pmatrix} 1 & k \\ 0 & 1 \end{pmatrix}
  \implies f(L^k) = \frac{1}{k+1}
  $$

  Thus we can detect when we are at $$ R^{k-1} $$ and move to $$ L^{k} $$.

  Note: It is sufficient to check that the top-right left entry is $$ 1 $$,
        since the parent of every integer is an integer.
</details>

<details>
  <summary>
  2\. Find the successor for a node in the same layer.

  To find the successor we must go back up the tree until we find a common
  ancestor, and back down the tree to the successor. If $$ j $$ is the number of
  trailing $$ R $$s in the path for $$ S $$ then:

  $$
    s(S)
    = SR^{-j}L^{-1}RL^j
    = S \begin{pmatrix} 0 & -1 \\ 1 & 2j+1 \end{pmatrix}
  $$
  </summary>

  Consider how a number is incremented in binary:
  we increment the least significant $$ 0 $$ digit, and set all the bits to the
  right to of the $$ 0 $$ to $$ 1 $$. For example:

  $$
  {\color{grey}100}0_2 + 1_2 =  {\color{grey}100}1_2 \quad
  {\color{grey}10}011_2 + 1_2 = {\color{grey}10}100_2 \quad
              01111_2 + 1_2 =  10000_2 \quad
  $$

  In the path string this means finding the trailing $$ R $$s and
  preceding $$ L $$, and transposing them:

  $$
    s(S)
    = s(TLR^j)
    = TRL^j
  $$ where $$ T $$ is an arbitrary prefix.

  Next we can use the inverse matrices to remove suffix of $$ S $$
  (or, travelling back up the tree), and replace it with the path to the
  successor:

  $$
    s(S)
    = T(LR^jR^{-j}L^{-1})RL^j
    = SR^{-j}L^{-1}RL^j
  $$

  Finally it is possible to calculate that:

  $$
   R^{-j}L^{-1}RL^j
   = \begin{pmatrix} 1 & 0 \\ -j & 1 \end{pmatrix}
     \begin{pmatrix} 1 & -1 \\ 0 & 1 \end{pmatrix}
     \begin{pmatrix} 1 & 0 \\ 1 & 1 \end{pmatrix}
     \begin{pmatrix} 1 & j \\ 0 & 1 \end{pmatrix}
   = \begin{pmatrix} 0 & -1 \\ 1 & 2j+1 \end{pmatrix}
  $$

</details>

Now we need to determine $$ j $$. If we were after the _leading_ $$ R $$s we
could take advantage of what we learnt from Euclid's algorithm above. With
a clever manipulation of matrices we can still use it to get:

<details>
  <summary>
  $$ S = \begin{pmatrix} n & n' \\ m & m' \end{pmatrix} \implies
     j = \left\lfloor \frac{n+m-1}{n'+m'} \right\rfloor  $$
  </summary>

  First note following general properties about matrices:

  $$ (AB)^T = B^T A^T $$

  $$
     J = \begin{pmatrix}0 & 1 \\ 1 & 0 \end{pmatrix}
     \implies
     J^2 = I
  $$

  $$
     A^\tau = JA^TJ \text{ where } A^\tau \text{ is } A
     \text{ transposed along the off-diagonal }
  $$

  Also, by inspection, $$ L^\tau = L \text{ and } R^\tau = R $$.

  Define an arbitrary path as:
  $$ S = L^{l_0} R^{r_1} ... L^{l_n} R^{r_n} $$

  Then the result of reversing the path gives us the same result as transposing
  $$ S $$ along the anti-diagonal:

  $$
  \begin{eqnarray}
    S^\tau &=& JS^TJ \\
           &=& J(R^{r_n T} L^{l_n T} ... R^{r_1 T} L^{l_0 T})J \\
           &=& JR^{r_n T} JJ L^{l_n T} JJ ... JJ R^{r_1 T} JJ L^{l_0 T}J \\
           &=& R^{r_n} L^{l_n} ... R^{r_1} L^{l_0} \\
  \end{eqnarray}
  $$

  Because $$ S^\tau $$ is itself a valid path, it is valid rational in the
  Stern-Brocot tree where:

  $$
    f(S^\tau)
    = f\left(\begin{pmatrix} m' & n' \\ m & n\end{pmatrix}\right)
    = \frac{m+n}{m'+n'}
  $$

  This allows us to determine $$ j $$ by finding the number of _leading_
  $$ R $$s in the path representation of $$ \frac{m+n}{m'+n'} $$, since these
  are the now the _first_ branches we take.

  Given our Euclidean algorithm above, this is the number of times we can
  subtract $$ n'+m' $$ from $$ n+m $$ without reaching $$ 0 $$, thus:

  $$ j = \left\lfloor \frac{n+m-1}{n'+m'} \right\rfloor  $$
</details>


Putting it all together we have:

TODO: n = 1 is wrong. It should be n'+n

$$

s(S) = s\left(\begin{pmatrix} n & n' \\ m & m' \end{pmatrix}\right)
=
\begin{cases}
  \begin{pmatrix} 1 & m+2 \\ 0 & 1 \end{pmatrix}    & n = 1   \\
  S\begin{pmatrix} 0 & -1 \\ 1 & 2j+1 \end{pmatrix} & n \ne 1 \\
\end{cases}
$$

<div id="matrix-mapping-iteration" class="iteration-tree-container">
  <div id="matrix-mapping-iterator" class="iteration-container"></div>
  <canvas id="matrix-mapping-tree" width="400" height="400">
    Your browser does not support canvas.
  </canvas>
</div>


We can now iterate over the rationals without having to run the Euclidean
algorithm each time! However, we need to carry around extra state $$ S $$,
because we can't recover the state directly from a given rational.

Let's fix this.

# The Calkin-Wilf Tree

The iteration forumla above was made possible considering the paths in
_reverse_, so let's explore that further.
If we reverse the paths, we create a new tree which still contains all the
rationals, but with the numbers permuted within each layer.

This is the [Calkin-Wilf tree](https://en.wikipedia.org/wiki/Calkin%E2%80%93Wilf_tree):

<div>
  <canvas id='calkin-wilf-demo' width="500" height="400">
    Your browser does not support canvas.
  </canvas>
</div>

The most obvious difference is that the numbers are no longer in order.
This is an unfortunate loss, but let's see what we get in return.

<details>
  <summary>
  The children of a node $$ \frac{a}{b} $$
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

Unlike the Stern-Brocot tree, we don't need to carry around a state matrix
to compute the children, we can use the fraction directly! Let's see how this
affects the iteration formula.

## Iterating over the Rationals

Now let's define the successor function over rationals as
$$ s(q=\frac{a}{b}) $$.

<details>
  <summary>

  It turns out that we can use the same state matrix $$ S $$ that we used for
  the Stern-Brocot tree to determine the values for the Calkin-Wilf tree.

  We define $$ f' $$ to represent this value:
  $$
    q = f'(S) = f'\left(\begin{pmatrix} n & n' \\ m & m' \end{pmatrix}\right)
              = \frac{m+n}{m'+n'}
  $$

  </summary>

  $$ f' $$ is equal to $$ f $$ applied to the reverse path. Recall above,
  when determing the value of $$ j $$ in the iteration forumla
  we discovered the following property:

  $$
    f'\left(\begin{pmatrix} n & n' \\ m & m' \end{pmatrix}\right)
    = f'(S)
    = f(S^\tau) = f(JS^TJ)
    \text{ where } J = \begin{pmatrix}0 & 1 \\ 1 & 0 \end{pmatrix}
  $$

  Hence:

  $$q = \frac{m+n}{m'+n'}$$

</details>

<details>
  <summary>

  We can now expand out our iteration formula to find the dramatically simpler
  formula:

  $$ s(q) = f'(s(S)) =
    \begin{cases}
      \frac{1}{q} & b = 1   \\
      \frac{1}{2j+1-q} & b \ne 1 \\
    \end{cases}
  $$

  </summary>

  Plug $$ f'(s(S)) $$ using the Stern-Brocot iteration formula:

  $$
  f'(s(S))
  =
  \begin{cases}
    f'\left(\begin{pmatrix} 1 & m+2 \\ 0 & 1 \end{pmatrix}\right) & n = 1   \\
    f'\left(S\begin{pmatrix} 0 & -1 \\ 1 & 2j+1 \end{pmatrix}\right) & n \ne 1 \\
  \end{cases}
  $$

  The first case can be calculated directly
  (or simply from observing that we require $$ s(q) = \frac{1}{q+1} $$):

  $$
    f'\left(\begin{pmatrix} 1 & m+2 \\ 0 & 1 \end{pmatrix}\right) = \frac{1}{m+1} = \frac{1}{a+1} = \frac{1}{q+1}
  $$

  Expanding the second case we get:

  $$
  \begin{eqnarray}
    f'\left(S\begin{pmatrix} 0 & -1 \\ 1 & 2j+1 \end{pmatrix}\right)
      &=& f'\left(\begin{pmatrix} m'(2j+1)-m & n'(2j+1)-n \\ m' & n' \end{pmatrix}\right) \\
      &=& \frac{m'+n'}{m'(2j+1)-m+n'(2j+1)-n} \\
      &=& \frac{b}{b(2j+1)-a} \\
      &=& \frac{1}{2j+1-q}
  \end{eqnarray}
  $$

</details>

<details>
  <summary>
  However, the two cases can be combined into one.
  </summary>

  When $$ b = 1 $$, $$ q $$ is an integer, hence:

  $$
    q = \lfloor q \rfloor \implies
    \frac{1}{q+1} = \frac{1}{2 \lfloor q \rfloor + 1 - q}
  $$

  When $$ b \ne 1 $$, we can also simplify $$ j $$:

  $$
  \begin{eqnarray}
    j &=& \left\lfloor \frac{n+m-1}{n'+m'} \right\rfloor \\
      &=& \left\lfloor \frac{a-1}{b} \right\rfloor \\
      &=& \left\lfloor \frac{a}{b} \right\rfloor \text{ when } b \ne 1 \\
      &=& \lfloor q \rfloor
  \end{eqnarray}
  $$

</details>

Giving a final, simple formula for iterating through the positive rational numbers:

$$
  s(q) = \frac{1}{2 \lfloor q \rfloor + 1 - q}

  \quad
  \text{ or }
  \quad

  s\left(\frac{a}{b}\right) = \frac{b}{2 b \left\lfloor \frac{a}{b} \right\rfloor + b - a}
$$

<div id="final-mapping" class="iteration-tree-container">
  <div id="final-mapping-iterator" class="iteration-container"></div>
  <canvas id="final-mapping-tree" width="480" height="400">
    Your browser does not support canvas.
  </canvas>
</div>

---

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
