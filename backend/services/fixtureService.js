const KNOCKOUT_ROUND_NAMES = {
  1: 'Final',
  2: 'Semifinal',
  4: 'Quarterfinal',
};

function knockoutRoundName(matchesInRound, totalRounds, roundIndex) {
  if (KNOCKOUT_ROUND_NAMES[matchesInRound]) return KNOCKOUT_ROUND_NAMES[matchesInRound];
  return `Round ${roundIndex + 1} of ${totalRounds}`;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Standard bracket seeding order (1-indexed), e.g. size 8 -> [1,8,4,5,2,7,3,6].
 * Spreads any byes across separate first-round matches instead of letting
 * them cluster into a match with two empty slots.
 */
function seedOrder(size) {
  let seeds = [1];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    const next = [];
    for (const s of seeds) {
      next.push(s, n + 1 - s);
    }
    seeds = next;
  }
  return seeds;
}

/**
 * Single-elimination bracket. Byes are given to the top seeds when the team
 * count isn't a power of two, spread via standard seeding so no first-round
 * match ends up with two byes. Each round is annotated with the slot it
 * feeds into in the next round (for progression).
 */
function generateKnockout(teamIds, { seeded = false } = {}) {
  const teams = seeded ? [...teamIds] : shuffle(teamIds);
  const size = 2 ** Math.ceil(Math.log2(Math.max(teams.length, 2)));

  const order = seedOrder(size);
  const slots = new Array(size).fill(null);
  order.forEach((bracketPosition, seedIndex) => {
    slots[bracketPosition - 1] = seedIndex < teams.length ? teams[seedIndex] : null;
  });

  const rounds = [];
  let currentRoundTeams = slots;
  let roundIndex = 0;
  const totalRounds = Math.log2(size);

  // matchRefs[roundIndex] = array of match objects for that round, in bracket order
  const matchRefs = [];

  while (currentRoundTeams.length > 1) {
    const matchesInRound = currentRoundTeams.length / 2;
    const roundName = knockoutRoundName(matchesInRound, totalRounds, roundIndex);
    const roundMatches = [];

    for (let i = 0; i < matchesInRound; i += 1) {
      const teamA = currentRoundTeams[i * 2];
      const teamB = currentRoundTeams[i * 2 + 1];
      const match = {
        round: roundName,
        round_order: roundIndex,
        team_a_id: teamA,
        team_b_id: teamB,
        status: 'scheduled',
        // A bye (null opponent) auto-advances the present team.
        winner_id: teamA && !teamB ? teamA : (!teamA && teamB ? teamB : null),
      };
      roundMatches.push(match);
    }

    matchRefs.push(roundMatches);
    rounds.push(roundMatches);

    // Winners (or bye-advanced teams) feed into the next round in order.
    currentRoundTeams = roundMatches.map((m) => m.winner_id ?? null);
    roundIndex += 1;
  }

  // Link each match to the slot it feeds in the following round.
  for (let r = 0; r < matchRefs.length - 1; r += 1) {
    matchRefs[r].forEach((match, i) => {
      match._nextRoundIndex = r + 1;
      match._nextMatchIndex = Math.floor(i / 2);
      match._nextSlot = i % 2 === 0 ? 'A' : 'B';
    });
  }

  return { rounds, size };
}

/**
 * Round-robin via the circle method: every team plays every other team once.
 * Rounds are labelled "Round 1".."Round N" (N-1 rounds for N teams, or N for
 * odd counts where each round has one bye).
 */
function generateRoundRobin(teamIds) {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null); // bye slot

  const n = teams.length;
  const totalRounds = n - 1;
  const half = n / 2;
  const rotation = [...teams];
  const rounds = [];

  for (let round = 0; round < totalRounds; round += 1) {
    const roundMatches = [];
    for (let i = 0; i < half; i += 1) {
      const teamA = rotation[i];
      const teamB = rotation[n - 1 - i];
      if (teamA !== null && teamB !== null) {
        roundMatches.push({
          round: `Round ${round + 1}`,
          round_order: round,
          team_a_id: teamA,
          team_b_id: teamB,
          status: 'scheduled',
          winner_id: null,
        });
      }
    }
    rounds.push(roundMatches);

    // Rotate all but the first element.
    rotation.splice(1, 0, rotation.pop());
  }

  return { rounds };
}

module.exports = { generateKnockout, generateRoundRobin };
