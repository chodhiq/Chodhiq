export function canReportContent(viewerId, post, comment = null) {
  const authorId = comment?.author_id || post?.author_id;
  return Boolean(viewerId && authorId && authorId !== viewerId);
}
export function reportFailureMessage(code) {
  if (code === '42501') return 'Sign in again or refresh the feed before reporting.';
  if (code === 'P0001') return 'The hourly report limit has been reached. Please try again later.';
  if (code === 'P0002') return 'This content is no longer available. Refresh the feed.';
  if (code === '22023')
    return 'This report is not valid for the selected content. Refresh the feed and choose a report reason.';
  return 'Your report was not sent. Check your connection and retry.';
}
