/**
 * Returns a range of two dates (startDate and endDate) within the same month, excluding today.
 */
export function getDateRangeWithoutToday() {
  const today = (new Date()).getDate();

  // Try to get the latest possible range before today
  let endDate = today - 1;
  let startDate = endDate - 2;

  if (startDate < 1) {
    // Not enough days before today, so use a range after today
    startDate = today + 1;
    endDate = startDate + 2;
  }

  return { startDate, endDate };
}


/**
 * Returns a range of two dates (startDate and endDate) within the same month, including today.
 */
export function getDateRangeIncludingToday() {
  const today = (new Date()).getDate();

  let startDate: number;
  let endDate: number;

  if (today === 1) {
    // If today is the 1st, use the first three days of the month
    startDate = 1;
    endDate = 3;
  } else if (today < 28) {
    // If today is between 2 and 27, center the range around today
    startDate = today - 1;
    endDate = today + 1;
  } else {
    // If today is 28 or later, end the range at today
    startDate = today - 2;
    endDate = today;
  }

  return { startDate, endDate };
}
