import _ from 'lodash'
import React from 'react'
import * as crowd_bt from '../lib/crowd_bt'

// let items = [
//     'Iron Man',
//     'The Incredible Hulk',
//     'Iron Man 2',
//     'Thor',
//     'Captain America: The First Avenger',
//     "Marvel's The Avengers",
//     'Iron Man 3',
//     'Thor: The Dark World',
//     'Captain America: The Winter Soldier',
//     'Guardians of the Galaxy',
//     'Avengers: Age of Ultron',
//     'Ant-Man',
//     'Captain America: Civil War',
//     'Doctor Strange',
//     'Guardians of the Galaxy Vol. 2',
//     'Spider-Man: Homecoming',
//     'Thor: Ragnarok',
//     'Black Panther',
//     'Avengers: Infinity War',
//     'Ant-Man and the Wasp',
//     'Captain Marvel',
//     'Avengers: Endgame',
//     'Spider-Man: Far From Home',
// ]
// let defaultDecisions = [
//     [0, 1],
//     [12, 1],
//     [12, 20],
//     [21, 20],
//     [11, 21],
//     [11, 15],
//     [14, 15],
//     [0, 2],
//     [3, 2],
//     [3, 4],
//     [22, 4],
//     [5, 22],
//     [5, 6],
//     [6, 18],
//     [18, 7],
//     [8, 7],
//     [9, 8],
//     [9, 22],
//     [22, 10],
//     [18, 10],
//     [18, 19],
//     [13, 19],
//     [13, 7],
//     [15, 7],
//     [16, 15],
//     [16, 17],
//     [17, 14],
//     [14, 13],
//     [11, 13],
//     [5, 11],
//     [5, 9],
//     [9, 0],
//     [0, 12],
//     [3, 12],
//     [16, 3],
//     [16, 13],
// ]

let items = [
    'Brown University',
    'Columbia University',
    'Cornell University',
    'Dartmouth College',
    'Harvard University',
    'University of Pennsylvania',
    'Princeton University',
    'Yale University',
]
let defaultDecisions = []
;(global as any)._ = _

export default function App() {
    let [decisions, setDecisions] = React.useState(defaultDecisions)

    let [things, annotators] = React.useMemo(() => {
        // console.log(decisions)
        let annotators = [
            {
                alpha: crowd_bt.ALPHA_PRIOR,
                beta: crowd_bt.BETA_PRIOR,
            },
        ]

        let things = items.map((k, i) => ({
            index: i,
            name: k,
            mu: crowd_bt.MU_PRIOR,
            sigma_sq: crowd_bt.SIGMA_SQ_PRIOR,
        }))

        for (let [windex, lindex] of decisions) {
            let winner = things[windex],
                loser = things[lindex]

            let annotator = annotators[0]
            ;[
                annotator.alpha,
                annotator.beta,
                winner.mu,
                winner.sigma_sq,
                loser.mu,
                loser.sigma_sq,
            ] = crowd_bt.update(
                annotator.alpha,
                annotator.beta,
                winner.mu,
                winner.sigma_sq,
                loser.mu,
                loser.sigma_sq
            )
        }

        console.log(things, annotators)
        return [things, annotators]
    }, [decisions])

    function pickInteresting(...exclude) {
        if (Math.random() < crowd_bt.EPSILON) {
            return _.sample(
                _.without(
                    things.map(k => k.index),
                    ...exclude
                )
            )
        } else {
            let user = annotators[0]
            let prev = exclude[exclude.length - 1]

            return _.maxBy(
                _.without(
                    things.map(k => k.index),
                    ...exclude
                ),
                i =>
                    crowd_bt.expected_information_gain(
                        user.alpha,
                        user.beta,
                        things[prev].mu,
                        things[prev].sigma_sq,
                        things[i].mu,
                        things[i].sigma_sq
                    )
            )
        }
    }

    function pickInterestingPair(...exclude) {
        let user = annotators[0]
        let bestPair = null
        let bestInfo = 0
        for (let i = 0; i < things.length; i++) {
            for (let j = 0; j < i; j++) {
                if (exclude.includes(i) || exclude.includes(j)) continue
                let info = crowd_bt.expected_information_gain(
                    user.alpha,
                    user.beta,
                    things[i].mu,
                    things[i].sigma_sq,
                    things[j].mu,
                    things[j].sigma_sq
                )
                if (info > bestInfo) {
                    bestInfo = info
                    bestPair = [i, j]
                }
            }
        }
        console.log(bestPair, bestInfo)
        return bestPair
    }

    let [left, setLeft] = React.useState(0)
    let [right, setRight] = React.useState(() => pickInteresting(left))

    React.useEffect(() => {
        let keyDown = e => {
            if (e.key === 'ArrowLeft') {
                setDecisions(k => [...k, [left, right]])

                let [L, R] = pickInterestingPair(left, right)
                setLeft(L)
                setRight(R)

                // setLeft(right)
                // setRight(pickInteresting(left, right))
            } else if (e.key === 'ArrowRight') {
                setDecisions(k => [...k, [right, left]])

                let [L, R] = pickInterestingPair(left, right)
                setLeft(L)
                setRight(R)

                // setLeft(right)
                // setRight(pickInteresting(left, right))
            }
        }
        document.body.addEventListener('keydown', keyDown)
        return () => document.body.removeEventListener('keydown', keyDown)
    })

    return (
        <div
            style={{
                display: 'flex',
                height: '100vh',
                font: '20px sans-serif',
            }}
        >
            <style jsx global>{`
                body {
                    padding: 0;
                    margin: 0;
                    background: black;
                    color: white;
                }
            `}</style>
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    textAlign: 'center',
                }}
            >
                <div style={{ width: '50%', padding: 100 }}>{items[left]}</div>
                <div style={{ width: '50%', padding: 100 }}>{items[right]}</div>
            </div>
            <div
                style={{
                    width: '400px',
                    background: '#222',
                    padding: 20,
                    overflow: 'auto',
                }}
            >
                <table>
                    <tbody>
                        <tr>
                            <th>Name</th>
                            <th>µ</th>
                            <th>σ²</th>
                        </tr>
                        {_.sortBy(things, k => -k.mu).map((k, i) => (
                            <tr key={i}>
                                <td>{k.name}</td>
                                <td>{k.mu.toFixed(2)}</td>
                                <td>{k.sigma_sq.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
