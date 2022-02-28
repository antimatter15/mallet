import React from "react"
import * as crowd_bt from "./crowd_bt"

export default function App() {
    const [text, setText] = React.useState("")
    const [items, setItems] = React.useState<
        Record<
            string,
            {
                name: string
                index: number
                id: string
                mu: number
                sigma_sq: number
            }
        >
    >({})

    const [annotator, setAnnotator] = React.useState({
        alpha: crowd_bt.ALPHA_PRIOR,
        beta: crowd_bt.BETA_PRIOR,
    })
    const [left, setLeft] = React.useState("")
    const [right, setRight] = React.useState("")

    const nextRound = (winner_id: string, loser_id: string) => {
        setTimeout(() => {
            let winner = items[winner_id]
            let loser = items[loser_id]
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
            let [newLeft, newRight] = pickInterestingPair(winner_id, loser_id)
            setLeft(newLeft)
            setRight(newRight)
            let newText = Object.values(items)
                .sort((a, b) => b.mu - a.mu)
                .map((k, i) => {
                    k.index = i
                    return k.name
                })
                .join("\n")
            setText(newText)
        }, 100)
    }

    function pickInterestingPair(...exclude: string[]): [string, string] {
        let bestPair: [string, string] | null = null
        let bestInfo = 0
        let things = Object.values(items)
        for (let i = 0; i < things.length; i++) {
            if (exclude.includes(things[i].id)) continue
            for (let j = 0; j < i; j++) {
                if (exclude.includes(things[j].id)) continue
                let info = crowd_bt.expected_information_gain(
                    annotator.alpha,
                    annotator.beta,
                    things[i].mu,
                    things[i].sigma_sq,
                    things[j].mu,
                    things[j].sigma_sq
                )
                if (info > bestInfo) {
                    bestInfo = info
                    bestPair = [things[i].id, things[j].id]
                }
            }
        }
        console.log(bestPair, bestInfo)
        if (Math.random() < 0.5) bestPair = [bestPair![1], bestPair![0]]

        return bestPair!
    }

    React.useEffect(() => {
        let keyDown = (e: KeyboardEvent) => {
            if (
                document.activeElement &&
                document.activeElement.tagName === "TEXTAREA"
            )
                return
            if (!(items[left] && items[right])) return
            if (e.key === "ArrowLeft") {
                let color =
                    items[left].mu > items[right].mu ? "gray" : "#007fff"
                document.getElementById("left")!.style.background = color
                nextRound(left, right)
            } else if (e.key === "ArrowRight") {
                let color =
                    items[left].mu < items[right].mu ? "gray" : "#007fff"
                document.getElementById("right")!.style.background = color
                nextRound(right, left)
            }
        }
        document.body.addEventListener("keydown", keyDown)
        return () => document.body.removeEventListener("keydown", keyDown)
    })

    return (
        <div
            style={{
                display: "flex",
                height: "100vh",
                font: "20px sans-serif",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flex: 1,
                    textAlign: "center",
                }}
            >
                {Object.keys(items).length < 4 ? (
                    <div
                        style={{
                            flex: 1,
                            padding: 100,
                        }}
                    >
                        Not enough entries to rank!
                    </div>
                ) : !(items[left] && items[right]) ? (
                    <div
                        style={{
                            flex: 1,
                            padding: 100,
                        }}
                    >
                        <button
                            onClick={(e) => {
                                let [newLeft, newRight] = pickInterestingPair(
                                    left,
                                    right
                                )
                                setLeft(newLeft)
                                setRight(newRight)
                            }}
                        >
                            Start!
                        </button>
                    </div>
                ) : (
                    <>
                        <div
                            id="left"
                            style={{ width: "50%", padding: 100 }}
                            key={left}
                        >
                            {items[left].name}
                        </div>
                        <div
                            id="right"
                            style={{ width: "50%", padding: 100 }}
                            key={right}
                        >
                            {items[right].name}
                        </div>
                    </>
                )}
            </div>
            <div
                style={{
                    display: "flex",
                    borderLeft: "1px solid gray",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <div
                        style={{
                            fontWeight: "bold",
                            textAlign: "center",
                        }}
                    >
                        Name
                    </div>
                    <textarea
                        style={{
                            background: "transparent",
                            font: "inherit",
                            width: 250,
                            color: "inherit",
                            whiteSpace: "pre",
                            outline: 0,
                            border: 0,
                            flex: 1,
                            paddingLeft: 10,
                        }}
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value)
                            let oldLines = text
                                .split("\n")
                                .filter((k) => k.trim() != "")
                            let newLines = e.target.value
                                .split("\n")
                                .filter((k) => k.trim() != "")

                            let newItems: typeof items = {}
                            newLines.map((k, i) => {
                                let match =
                                    oldLines.length === newLines.length
                                        ? Object.keys(items).find(
                                              (j) => items[j].index === i
                                          )
                                        : Object.keys(items).find(
                                              (j) => items[j].name === k
                                          )
                                if (match) {
                                    newItems[match] = items[match]
                                    newItems[match].name = k
                                    newItems[match].index = i
                                } else {
                                    let newId = Math.random()
                                        .toString(36)
                                        .substring(2, 15)
                                    newItems[newId] = {
                                        name: k,
                                        index: i,
                                        id: newId,
                                        mu: crowd_bt.MU_PRIOR,
                                        sigma_sq: crowd_bt.SIGMA_SQ_PRIOR,
                                    }
                                }
                            })
                            setItems(newItems)
                        }}
                    ></textarea>
                </div>
                <div
                    style={{
                        whiteSpace: "pre",
                        width: 50,
                    }}
                >
                    <div
                        style={{
                            fontWeight: "bold",
                            textAlign: "center",
                        }}
                    >
                        µ
                    </div>
                    <div
                        style={{
                            textAlign: "right",
                        }}
                    >
                        {text
                            .split("\n")
                            .map((k, i) => {
                                let m = Object.values(items).find(
                                    (j) => j.name === k
                                )
                                if (!m) return ""
                                return m.mu.toFixed(2)
                            })
                            .join("\n")}
                    </div>
                </div>
                <div
                    style={{
                        whiteSpace: "pre",
                        width: 50,
                    }}
                >
                    <div
                        style={{
                            fontWeight: "bold",
                            textAlign: "center",
                        }}
                    >
                        σ²
                    </div>
                    <div
                        style={{
                            textAlign: "right",
                        }}
                    >
                        {text
                            .split("\n")
                            .map((k, i) => {
                                let m = Object.values(items).find(
                                    (j) => j.name === k
                                )
                                if (!m) return ""
                                return m.sigma_sq.toFixed(2)
                            })
                            .join("\n")}
                    </div>
                </div>
            </div>
        </div>
    )
}
