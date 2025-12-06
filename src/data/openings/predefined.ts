import type { PredefinedOpening } from '@/types/opening'

/**
 * Collection of predefined chess openings
 * Each opening includes main lines and common variations with commentary
 */
export const predefinedOpenings: PredefinedOpening[] = [
  // White Openings
  {
    id: 'italian-game',
    name: 'Italian Game',
    eco: 'C50',
    color: 'white',
    description: 'A classical opening that develops pieces naturally and fights for the center.',
    pgn: `1. e4 {The King's Pawn opening - controlling the center and opening lines for the bishop and queen.} e5 
2. Nf3 {Attacking the e5 pawn and developing a knight.} Nc6 {Defending the pawn.} 
3. Bc4 {The Italian Game - targeting the f7 square, Black's weakest point.} Bc5 {The Giuoco Piano - symmetrical development.} 
(3... Nf6 {The Two Knights Defense - a more aggressive approach.} 4. Ng5 {The Fried Liver Attack setup.} d5 5. exd5 Na5 {The main line, attacking the bishop.})
4. c3 {Preparing d4 to build a strong pawn center.} Nf6 
5. d4 {Striking in the center.} exd4 6. cxd4 Bb4+ 7. Bd2 {The main line continues with active piece play.}`
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    eco: 'C65',
    color: 'white',
    description: 'One of the oldest and most respected openings, offering rich strategic play.',
    pgn: `1. e4 {Opening with the king pawn.} e5 
2. Nf3 {Developing and attacking e5.} Nc6 
3. Bb5 {The Ruy Lopez (Spanish Opening) - putting pressure on the knight that defends e5.} a6 {The Morphy Defense - the most common response.}
(3... Nf6 {The Berlin Defense - solid and drawish at the highest level.} 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 {The Berlin Endgame.})
(3... f5 {The Schliemann Defense - aggressive but risky.})
4. Ba4 {Maintaining the pin.} Nf6 
(4. Bxc6 {The Exchange Variation.} dxc6 5. O-O {White aims for a better endgame with the superior pawn structure.})
5. O-O {Castling and preparing Re1.} Be7 {The Closed Defense - solid and flexible.}
(5... Nxe4 {The Open Variation.} 6. d4 b5 7. Bb3 d5 8. dxe5 Be6 {Sharp play with chances for both sides.})
6. Re1 {Preparing to support the e4 pawn.} b5 7. Bb3 O-O 8. c3 {Preparing d4.} d6 {A typical position in the Closed Ruy Lopez.}`
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    eco: 'D06',
    color: 'white',
    description: 'A classical opening offering a pawn to gain central control.',
    pgn: `1. d4 {The Queen's Pawn opening.} d5 
2. c4 {The Queen's Gambit - offering a pawn for central control.} e6 {The Queen's Gambit Declined - solid and reliable.}
(2... dxc4 {The Queen's Gambit Accepted.} 3. Nf3 Nf6 4. e3 e6 5. Bxc4 c5 6. O-O {White has easy development and central control.})
(2... c6 {The Slav Defense - supporting d5 with a pawn.} 3. Nf3 Nf6 4. Nc3 dxc4 {The main line Slav.})
3. Nc3 {Developing and supporting e4.} Nf6 
4. Bg5 {Pinning the knight - a key idea in the QGD.} Be7 
(4... Nbd7 {The Orthodox Defense.} 5. e3 c6 6. Nf3)
5. e3 {Solid development.} O-O 6. Nf3 h6 {Asking the bishop to make a decision.} 
7. Bh4 {Maintaining the pin.} b6 {Preparing to fianchetto the queen's bishop.}`
  },
  {
    id: 'london-system',
    name: 'London System',
    eco: 'D02',
    color: 'white',
    description: 'A solid system opening that can be played against almost any Black setup.',
    pgn: `1. d4 {Starting with d4.} d5 
2. Bf4 {The London System - developing the bishop before playing e3.} Nf6 
(2... c5 {Challenging the center immediately.} 3. e3 Nc6 4. c3 {Solid structure.})
3. e3 {Solid pawn structure.} c5 
4. c3 {Supporting the d4 pawn.} Nc6 
5. Nd2 {The knight goes to d2 to support e4 later.} e6 
6. Ngf3 {Completing development.} Bd6 {Black challenges the f4 bishop.}
7. Bg3 {Keeping the bishop pair.} O-O 8. Bd3 {A typical London System position.}`
  },
  {
    id: 'vienna-game',
    name: 'Vienna Game',
    eco: 'C25',
    color: 'white',
    description: 'An aggressive alternative to the Italian Game, often leading to sharp tactical play.',
    pgn: `1. e4 e5 
2. Nc3 {The Vienna Game - developing the knight before Nf3.} Nf6 
(2... Nc6 3. Bc4 {Transposing to Italian-like positions.})
3. f4 {The Vienna Gambit - very aggressive!} d5 
(3... exf4 {Accepting the gambit.} 4. e5 {Attacking the knight.})
4. fxe5 Nxe4 5. Nf3 {White has active pieces and space.}`
  },

  // Black Openings
  {
    id: 'sicilian-najdorf',
    name: 'Sicilian Najdorf',
    eco: 'B90',
    color: 'black',
    description: 'The most popular and theoretically rich response to 1.e4, favored by world champions.',
    pgn: `1. e4 c5 {The Sicilian Defense - creating an asymmetrical pawn structure.}
2. Nf3 d6 {Preparing ...Nf6 and ...e5.}
3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 {The Najdorf Variation - flexible and fighting.}
6. Be3 {The English Attack - one of the main lines.} e5 
(6. Bg5 {Another major system.} e6 7. f4 {Sharp play ahead.})
(6. Be2 {The classical approach.} e5 7. Nb3 Be7)
7. Nb3 Be6 8. f3 {Preparing to castle queenside and attack.} Be7 9. Qd2 O-O 10. O-O-O {Opposite-side castling leads to mutual attacks.}`
  },
  {
    id: 'sicilian-dragon',
    name: 'Sicilian Dragon',
    eco: 'B70',
    color: 'black',
    description: 'An aggressive Sicilian variation with the fianchettoed bishop on g7.',
    pgn: `1. e4 c5 
2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 {The Dragon - fianchettoing the bishop.}
6. Be3 Bg7 {The dragon bishop - very powerful on the long diagonal.}
(6. Be2 {The Classical variation.} Bg7 7. O-O O-O 8. Nb3)
7. f3 {The Yugoslav Attack - the most critical test.} O-O 8. Qd2 Nc6 
9. Bc4 {Targeting f7.} Bd7 10. O-O-O {Both sides castle opposite and attack.}`
  },
  {
    id: 'french-defense',
    name: 'French Defense',
    eco: 'C00',
    color: 'black',
    description: 'A solid defense that leads to strategic battles around the pawn chains.',
    pgn: `1. e4 e6 {The French Defense - solid but somewhat passive.}
2. d4 d5 {Challenging the center.}
3. Nc3 {The main line.} Nf6 
(3. Nd2 {The Tarrasch Variation - avoiding pins on c3.} c5 4. exd5 exd5)
(3. e5 {The Advance Variation.} c5 4. c3 Nc6 5. Nf3 {Typical pawn chain play.})
4. Bg5 {Pinning the knight.} Be7 
(4... Bb4 {The McCutcheon Variation - active but committal.} 5. e5 h6)
(4... dxe4 {The Burn Variation.} 5. Nxe4)
5. e5 Nfd7 {The Steinitz Variation - classical French.}
6. Bxe7 Qxe7 7. f4 {White has space, Black has a solid position.}`
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defense',
    eco: 'B10',
    color: 'black',
    description: 'A solid defense that avoids the weaknesses of the French while fighting for the center.',
    pgn: `1. e4 c6 {The Caro-Kann - preparing ...d5 with pawn support.}
2. d4 d5 {Challenging the center immediately.}
3. Nc3 {The main line.} dxe4 4. Nxe4 Bf5 {The Classical Variation - developing the bishop actively.}
(3. e5 {The Advance Variation.} Bf5 4. Nf3 e6 5. Be2 {Solid for both sides.})
(3. exd5 {The Exchange Variation.} cxd5 {Symmetrical pawn structure.})
5. Ng3 Bg6 6. h4 {Trying to weaken Black's kingside.} h6 
7. Nf3 Nd7 8. h5 Bh7 9. Bd3 Bxd3 10. Qxd3 {A typical Caro-Kann position.}`
  },
  {
    id: 'kings-indian',
    name: "King's Indian Defense",
    eco: 'E60',
    color: 'black',
    description: 'A hypermodern defense allowing White to build a center, then counterattacking it.',
    pgn: `1. d4 Nf6 2. c4 g6 {The King's Indian setup.}
3. Nc3 Bg7 {Fianchettoing the bishop.}
4. e4 d6 {Allowing White a big center, planning to attack it.}
5. Nf3 O-O 6. Be2 e5 {The main line - striking at the center.}
(6... Nbd7 {The Orthodox line - more flexible.})
(6... c5 {The Benoni structure.})
7. O-O Nc6 {The Classical King's Indian.}
(7... exd4 {The Exchange Variation.} 8. Nxd4)
8. d5 Ne7 {A typical KID pawn structure - Black will play ...f5.}
9. Ne1 {Preparing f3 and g4.} Nd7 10. Nd3 f5 {Black's thematic break.}`
  },
  {
    id: 'dutch-defense',
    name: 'Dutch Defense',
    eco: 'A80',
    color: 'black',
    description: 'An aggressive defense aiming for kingside attack.',
    pgn: `1. d4 f5 {The Dutch Defense - an aggressive choice against d4.}
2. g3 {The Leningrad System for White.} Nf6 
(2. c4 {The main line.} Nf6 3. g3 e6 {The Stonewall setup.})
3. Bg2 g6 {The Leningrad Dutch - very aggressive kingside setup.}
4. Nf3 Bg7 5. O-O O-O 6. c4 d6 {A typical Leningrad Dutch position.}
7. Nc3 Nc6 {Black aims for ...e5 and kingside play.}`
  },
  {
    id: 'grunfeld-defense',
    name: 'Grünfeld Defense',
    eco: 'D80',
    color: 'black',
    description: 'A hypermodern defense striking at White\'s center with pieces rather than pawns.',
    pgn: `1. d4 Nf6 2. c4 g6 3. Nc3 d5 {The Grünfeld - striking at the center immediately.}
4. cxd5 Nxd5 5. e4 Nxc3 6. bxc3 Bg7 {White has the center, Black pressures it with the g7 bishop.}
7. Nf3 c5 {Attacking the d4 pawn.}
(7. Bc4 {The Classical line.} c5 8. Ne2 Nc6)
8. Be2 {The Exchange Variation.} Nc6 9. Be3 O-O 10. O-O {A typical Grünfeld middlegame.}`
  },
]

/**
 * Get a predefined opening by ID
 */
export function getPredefinedOpening(id: string): PredefinedOpening | undefined {
  return predefinedOpenings.find(o => o.id === id)
}

/**
 * Get all predefined openings for a specific color
 */
export function getOpeningsByColor(color: 'white' | 'black'): PredefinedOpening[] {
  return predefinedOpenings.filter(o => o.color === color)
}

/**
 * Search predefined openings by name or ECO code
 */
export function searchOpenings(query: string): PredefinedOpening[] {
  const lowerQuery = query.toLowerCase()
  return predefinedOpenings.filter(
    o => o.name.toLowerCase().includes(lowerQuery) ||
      o.eco.toLowerCase().includes(lowerQuery)
  )
}
