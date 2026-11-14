function lastSuccess(prevMeta) {
  return prevMeta?.source_checks?.property?.last_success_at
    || prevMeta?.last_successful_source_check_at
    || prevMeta?.generated_at
    || null;
}

export function propertyStreamStatus({
  propertyCrawlEmpty, verifiedEmpty, crawledRowsAllDiscarded, previousPropertyCount, prevMeta, attemptedAt,
}) {
  const attempt = { last_attempt_at: attemptedAt };
  if (propertyCrawlEmpty) {
    if (verifiedEmpty) return { status: 'verified_empty', ...attempt, last_success_at: attemptedAt };
    if (previousPropertyCount > 0) return { status: 'degraded', ...attempt, last_success_at: lastSuccess(prevMeta) };
    return { status: 'not_monitored', ...attempt, last_success_at: null };
  }
  if (crawledRowsAllDiscarded) return { status: 'degraded', ...attempt, last_success_at: lastSuccess(prevMeta) };
  return { status: 'healthy', ...attempt, last_success_at: attemptedAt };
}
