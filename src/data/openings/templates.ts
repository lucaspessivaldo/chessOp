/**
 * Starter repertoires. Kept short on purpose: a solid base the user can extend in the editor.
 * Comments placed after the user's moves are shown in Study mode before the move is played.
 */
export interface OpeningTemplate {
  id: string
  name: string
  eco: string
  color: 'white' | 'black'
  level: 'Beginner' | 'Intermediate'
  description: string
  pgn: string
}

export const OPENING_TEMPLATES: OpeningTemplate[] = [
  {
    id: 'italian-game',
    name: 'Italian Game',
    eco: 'C50–C54',
    color: 'white',
    level: 'Beginner',
    description: 'Classical development aiming at f7, with the slow and solid Giuoco Pianissimo plan.',
    pgn: `1. e4 {Claim the center and open lines for the queen and bishop.} e5
2. Nf3 {Develop with tempo: the knight attacks e5.} Nc6
(2... d6 {Philidor Defense: solid but passive.} 3. d4 {Strike the center while Black is cramped.} exd4
  (3... Nf6 4. Nc3 Nbd7 5. Bc4 {Point the bishop at f7.})
4. Nxd4 Nf6 5. Nc3 Be7 6. Bc4 {Easy development and a lead in space.})
3. Bc4 {The Italian bishop eyes f7, the weakest square in Black's camp.} Bc5
(3... Nf6 {Two Knights Defense.} 4. d3 {The calm approach: protect e4 and avoid sharp theory.} Be7
  (4... Bc5 5. c3 {Prepare d4 and give the bishop a retreat square.} d6 6. O-O O-O 7. Re1 {Support e4; Nbd2–f1–g3 comes next.})
5. O-O O-O 6. Re1 d6 7. c3 {Build slowly: a4, h3 and Nbd2 will follow.})
4. c3 {Giuoco Piano: prepare d4.} Nf6
(4... d6 5. d4 {Take the center now that ...Nf6 hasn't hit e4.} exd4 6. cxd4 Bb6 7. Nc3 {A big center and easy development.})
5. d3 {Giuoco Pianissimo: keep the tension and outmaneuver.} d6 6. O-O O-O 7. Re1 {The rook supports e4 and prepares d4.} a6
8. Bb3 {Keep the bishop safe from ...Na5 and ...d5 ideas.} Ba7 9. h3 {Stop ...Bg4 before playing Nbd2–f1.}`,
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    eco: 'D06–D37',
    color: 'white',
    level: 'Beginner',
    description: 'Challenge d5 with the c-pawn. Covers the Declined (Exchange), Accepted and Slav.',
    pgn: `1. d4 {Take the center with the queen's pawn.} d5
2. c4 {The Queen's Gambit: attack d5 with a wing pawn.} e6
(2... dxc4 {Queen's Gambit Accepted.} 3. e3 {Prepare Bxc4: the pawn cannot be held.} Nf6
  (3... e5 {An immediate counter in the center.} 4. Bxc4 exd4 5. exd4 {Active pieces make up for the isolated pawn.})
4. Bxc4 e6 5. Nf3 c5 6. O-O a6 7. a4 {Stop ...b5 from gaining space with tempo.})
(2... c6 {Slav Defense.} 3. Nf3 Nf6 4. Nc3 dxc4
  (4... e6 {Semi-Slav.} 5. e3 Nbd7 6. Qc2 {Prepare e4, or b3 and Bd3.})
5. a4 {Prevent ...b5, which would hold on to the pawn.} Bf5 6. e3 e6 7. Bxc4 {Regain the pawn with a comfortable position.})
3. Nc3 Nf6 4. cxd5 {Exchange Variation: fix Black's pawn structure.} exd5
5. Bg5 {Pin the knight and add pressure on d5.} Be7
(5... c6 6. Qc2 {Stop ...Bf5 and prepare e3 and Bd3.})
6. e3 O-O 7. Bd3 {Aim at h7.} Nbd7 8. Qc2 c6 9. Nge2 {Flexible: f3 and e4, or a minority attack with b4–b5.}`,
  },
  {
    id: 'london-system',
    name: 'London System',
    eco: 'D02',
    color: 'white',
    level: 'Beginner',
    description: 'A setup you can play against almost anything: Bf4, e3, c3 and a solid pyramid.',
    pgn: `1. d4 {Take the center.} d5
(1... Nf6 2. Bf4 {The same setup works against the Indian defenses.} g6 3. e3 Bg7 4. Nf3 O-O 5. Be2 d6 6. h3 {Keep a retreat square for the bishop on h2.})
2. Bf4 {The London: develop the bishop before e3 locks it in.} Nf6
3. e3 {Open the diagonal for the other bishop.} c5
(3... e6 4. Nf3 c5 5. c3 Nc6 6. Nbd2 Bd6 7. Bg3 {Keep the bishop; an exchange on g3 opens the h-file for you.})
4. c3 {Support d4 and build the pawn pyramid.} Nc6
5. Nd2 {Keep the option of Qb3 if Black's queen comes to b6.} Qb6
6. Qb3 {Offer the queen trade: it improves your pawn structure.}`,
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defense',
    eco: 'B12–B19',
    color: 'black',
    level: 'Beginner',
    description: 'A rock-solid answer to 1.e4: free development for the light-squared bishop.',
    pgn: `1. e4 c6 {Prepare ...d5 with a healthy pawn structure.}
2. d4
(2. Nc3 d5 3. Nf3 Bg4 {Pin the knight; ...e6 and ...Nf6 come next.} 4. h3 Bxf3 5. Qxf3 e6 {A solid structure with no weaknesses.})
2... d5 {Challenge the center immediately.}
3. Nc3
(3. e5 {Advance Variation.} Bf5 {Develop the bishop before playing ...e6.} 4. Nf3 e6 5. Be2 c5 {Hit the base of White's pawn chain.} 6. O-O Nc6 7. c3 cxd4 8. cxd4 Nge7 {Heading for f5 to pressure d4.})
(3. exd5 {Exchange Variation.} cxd5 4. Bd3 Nc6 5. c3 Nf6 6. Bf4 Bg4 {Develop actively before ...e6.} 7. Qb3 Qd7 {Protect b7 and connect the rooks later.})
(3. Nd2 dxe4 4. Nxe4 Bf5 {Same plan as against 3.Nc3.})
3... dxe4 4. Nxe4 Bf5 {Develop with tempo on the knight.}
5. Ng3 Bg6 6. h4 h6 {Keep the bishop on the h7–b1 diagonal.}
7. Nf3 Nd7 {Control e5 and prepare ...Ngf6.} 8. h5 Bh7 9. Bd3 Bxd3 10. Qxd3 e6
11. Bd2 Ngf6 12. O-O-O Be7 {Castle short next and break with ...c5.}`,
  },
  {
    id: 'scandinavian',
    name: 'Scandinavian Defense',
    eco: 'B01',
    color: 'black',
    level: 'Beginner',
    description: 'Hit e4 on move one and steer the game into a structure you know well.',
    pgn: `1. e4 d5 {Hit e4 right away.}
2. exd5
(2. e5 Bf5 {A French Defense where the bishop is already outside the pawn chain.} 3. d4 e6)
(2. Nc3 d4 {Gain space with tempo on the knight.} 3. Nce2 e5)
2... Qxd5 3. Nc3 Qa5 {The queen is safe on a5 and pins the knight.}
4. d4
(4. Nf3 Nf6 5. d4 c6 {Transposes to the main line.})
4... Nf6 5. Nf3 c6 {Give the queen a retreat on c7 and control d5.}
6. Bc4 Bf5 {Develop the bishop outside the pawn chain.} 7. Bd2 e6 8. Qe2 Bb4 {Develop with a pin and castle next.}`,
  },
]
