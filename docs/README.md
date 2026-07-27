# Documentation

This directory contains the MVP requirements, TDD behavior design, and detailed architecture design for Client Talk Coach.

## Product And Test Design

- [requirements.md](requirements.md): Personal MVP product requirements.
- [tdd-behavior-test-design.md](tdd-behavior-test-design.md): Natural-language behavior and TDD test requirements.

## Detailed Design

- [architecture-and-services.md](architecture-and-services.md): Architecture policy, layer responsibilities, and service-layer decisions.
- [api-design.md](api-design.md): CRUD vs use-case API split, HTTP API scope, API response formats, and STT / AI / analysis API I/O.
- [application-ports-and-storage.md](application-ports-and-storage.md): Application ports, external adapters, IndexedDB abstraction, tables, keys, and transactions.
- [domain-and-scenario-engine.md](domain-and-scenario-engine.md): Domain models, scenario fact states, scenario engine, and feedback priority.
- [error-and-dependency-design.md](error-and-dependency-design.md): Error taxonomy, retry behavior, data retention on failure, and TDD-friendly dependency injection.
- [directory-and-abstraction-design.md](directory-and-abstraction-design.md): Recommended directory structure and API abstraction granularity.
- [implementation-sequences-and-decisions.md](implementation-sequences-and-decisions.md): Main processing sequences and final implementation decisions.
- [pre-implementation-decisions.md](pre-implementation-decisions.md): Additional decisions to fix before MVP implementation starts.
