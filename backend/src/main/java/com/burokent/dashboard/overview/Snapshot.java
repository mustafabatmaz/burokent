package com.burokent.dashboard.overview;

import java.time.Instant;

/** The last value a source gave, and when we got it. */
record Snapshot<T>(T value, Instant fetchedAt) {}
