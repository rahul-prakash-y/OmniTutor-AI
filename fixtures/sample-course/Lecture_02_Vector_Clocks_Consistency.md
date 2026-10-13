# Lecture 02: Logical Time, Vector Clocks & Consistency Models

## 1. Physical vs. Logical Clocks
In distributed systems, physical quartz clocks drift due to temperature fluctuations and manufacturing variations. Network Time Protocol (NTP) provides synchronization within milliseconds over WANs, but cannot guarantee total order or determine causal precedence without uncertainty intervals (such as Google TrueTime's $\epsilon$ bounds).

### 1.1 Lamport Timestamps (1978)
Leslie Lamport established the **Happens-Before Relation** ($\rightarrow$):
1. If events $a$ and $b$ occur in the same process and $a$ precedes $b$, then $a \rightarrow b$.
2. If event $a$ is the sending of a message and event $b$ is the receipt of that message, then $a \rightarrow b$.
3. If $a \rightarrow b$ and $b \rightarrow c$, then $a \rightarrow c$ (transitivity).

Lamport Timestamps assign a monotonic integer $L(e)$ to every event:
- Process $i$ increments its clock before executing a local event: $L_i = L_i + 1$.
- When sending a message $m$, process $i$ attaches timestamp $L_i$.
- Upon receiving message $m$ with timestamp $t$, process $j$ updates: $L_j = \max(L_j, t) + 1$.

**Limitation:** $a \rightarrow b \implies L(a) < L(b)$, but $L(a) < L(b) \not\implies a \rightarrow b$. Lamport clocks cannot distinguish causal precedence from concurrency!

---

## 2. Vector Clocks
A **Vector Clock** is an array of $N$ logical clock values, where $N$ is the number of processes in the system. Each process $i$ maintains vector $V_i[1..N]$.

### 2.1 Update Rules
1. Before executing a local event, process $i$ increments its own coordinate: $V_i[i] = V_i[i] + 1$.
2. When sending a message $m$, process $i$ sends its current vector clock $V_i$.
3. When process $j$ receives message $m$ carrying vector $V_m$:
   - For all $k \neq j$: $V_j[k] = \max(V_j[k], V_m[k])$
   - For its own coordinate: $V_j[j] = \max(V_j[j], V_m[j]) + 1$

### 2.2 Causal Comparison
Given two vector timestamps $V_a$ and $V_b$:
- $V_a \leq V_b \iff \forall k: V_a[k] \leq V_b[k]$
- $V_a < V_b \iff V_a \leq V_b \text{ and } \exists k: V_a[k] < V_b[k]$ (Event $a$ causally precedes $b$)
- **Concurrency:** If neither $V_a < V_b$ nor $V_b < V_a$, then events $a$ and $b$ are **concurrent** ($a \parallel b$). Vector clocks allow distributed state machines to identify conflicting concurrent writes without data loss.

---

## 3. Distributed Consistency Models
- **Linearizability (Strong Consistency):** Every operation appears to take effect atomically at a discrete instant between its invocation and completion time on a global timeline. Reads always see the most recent write.
- **Sequential Consistency:** Operations of all processes are executed in some sequential order that respects the program order of each individual process.
- **Causal Consistency:** Operations that are causally related must be seen by every process in the same order. Concurrent operations may be observed in different orders.
- **Eventual Consistency:** In the absence of further updates, all replicas eventually converge to identical state.
