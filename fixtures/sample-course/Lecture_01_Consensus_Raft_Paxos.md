# Lecture 01: Consensus in Distributed Systems (Raft and Paxos)

## 1. The Core Problem of Consensus
In distributed systems, consensus is the problem of reaching agreement among a set of independent processes upon a single data value or state transition, even when processes may fail by crashing or network messages may be dropped, delayed, or duplicated.

### 1.1 The FLP Impossibility Theorem (Fischer, Lynch, Paterson, 1985)
In a purely asynchronous network, no deterministic consensus protocol can guarantee both safety (nothing bad happens) and liveness (something good eventually happens) in the presence of even a single unannounced crash failure.
Because of FLP, modern consensus algorithms like Raft and Paxos prioritize **Safety over Liveness**: they ensure safety unconditionally (no two nodes ever commit conflicting state transitions), while relying on partial synchrony (randomized election timeouts or heartbeats) to guarantee liveness.

---

## 2. The Raft Consensus Algorithm
Raft achieves state machine replication by decomposing consensus into three orthogonal subproblems:
1. **Leader Election:** A single leader is chosen when the previous leader fails.
2. **Log Replication:** The leader accepts log entries from clients, propagates them across follower replicas, and instructs when it is safe to apply them to state machines.
3. **Safety Invariants:** If any server has applied a log entry at a given index, no other server will ever apply a different log entry for the same index.

### 2.1 Server Roles and Terms
At any time, each server is in one of three states:
- **Leader:** Handles all client requests, replicates log entries, and sends periodic heartbeats.
- **Follower:** Completely passive; responds to incoming RPCs from leaders and candidates.
- **Candidate:** Used to elect a new leader.

Time is divided into discrete **Terms**, numbered with consecutive monotonic integers:
- Terms begin with an election.
- A candidate requests votes via `RequestVote` RPCs.
- If a candidate wins a majority of votes ($N/2 + 1$), it becomes the leader for the remainder of the term.
- If an election splits, the term ends without a leader, and a new term begins after a randomized timeout (typically 150ms to 300ms).

### 2.2 The AppendEntries RPC and Commit Condition
The leader replicates entries via `AppendEntries` RPCs. An entry is **committed** once the leader that created the entry has replicated it on a majority of servers.
Once an entry is committed, the leader increments `commitIndex` and applies the entry to its local state machine, replying to the client with the execution result.

---

## 3. Comparison with Paxos
- **Classic Paxos** operates in two phases:
  - **Phase 1 (Prepare / Promise):** A proposer chooses a proposal number $n$ and asks acceptors to promise not to accept proposals numbered less than $n$.
  - **Phase 2 (Accept / Accepted):** If a majority promises, the proposer issues an accept request with the value associated with the highest proposal number returned, or its own value if none was returned.
- **Multi-Paxos** optimizes this by electing a stable leader, amortizing Phase 1 across a stream of client commands.
- **Key Difference:** Raft enforces strict log continuity (no holes in the log) and the **Leader Completeness Property** (a candidate must contain all committed entries to win an election). Classic Paxos allows out-of-order consensus instances that must be resolved separately.
