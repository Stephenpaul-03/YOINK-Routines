function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = a[i - 1] === b[j - 1] ? diagonal : Math.min(diagonal + 1, row[j] + 1, row[j - 1] + 1);
      diagonal = above;
    }
  }
  return row[b.length];
}

function closestMatch(input, choices) {
  const ranked = choices.map((choice) => ({ choice, score: distance(input.toLowerCase(), choice.toLowerCase()) }))
    .sort((left, right) => left.score - right.score);
  if (!ranked.length) return undefined;
  const best = ranked[0];
  return best.score <= Math.max(2, Math.floor(input.length / 3)) ? best.choice : undefined;
}

module.exports = { closestMatch };
