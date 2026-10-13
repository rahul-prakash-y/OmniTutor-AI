# CS301: Distributed Systems & Cloud Infrastructure
**Term:** Spring 2026  
**Instructor:** Prof. Elena Vance, Ph.D.  
**Department:** Computer Science & Engineering  

## 1. Course Description
This course provides a rigorous foundation in the principles, paradigms, and architectures governing distributed computing systems. Topics include network timing models, logical and vector clocks, consensus algorithms (Raft, Paxos, Multi-Paxos), the CAP and PACELC theorems, replication strategies, distributed transactions (2PC, 3PC), and Byzantine fault tolerance.

## 2. Learning Objectives
By the end of this curriculum, students will be capable of:
1. Explaining the impossibility results in distributed computing, specifically the FLP Impossibility Theorem in asynchronous networks.
2. Formulating state machine replication algorithms using Raft leader election, log replication, and commit safety invariants.
3. Distinguishing linearizability, sequential consistency, and eventual consistency models.
4. Analyzing causal ordering of events using Lamport timestamps and Vector Clocks.
5. Implementing crash-recovery protocols and anti-entropy synchronization in partitioned environments.

## 3. Curriculum Schedule
- **Week 1:** Time and Global State. Physical vs. Logical Time, Drift, NTP, and Lamport Clocks.
- **Week 2:** Vector Clocks, Causal History, and Concurrency Detection.
- **Week 3:** Consensus Foundations: The Two Generals Problem, Byzantine Generals, and FLP Impossibility.
- **Week 4:** The Raft Consensus Algorithm: Election timeouts, terms, append-entries RPCs, and joint consensus.
- **Week 5:** Paxos and Multi-Paxos: Prepare/Promise phases, accept/accepted, and leader lease optimizations.
- **Week 6:** Consistency Models & Tradeoffs: Linearizability, CAP Theorem, and PACELC.
- **Week 7:** Distributed Transactions: Two-Phase Commit (2PC) and Three-Phase Commit (3PC).
- **Week 8:** Partition Tolerance, Quorum Systems, and Dynamo-style Read/Write repairs.
