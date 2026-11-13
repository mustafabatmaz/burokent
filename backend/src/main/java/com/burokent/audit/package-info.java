/**
 * Activity log: modules publish {@link com.burokent.audit.AuditEntry} events, which are written in the same
 * transaction to an append-only table that nobody can change or delete.
 */
package com.burokent.audit;
