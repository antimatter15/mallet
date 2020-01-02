import _ from 'lodash'
import React from 'react'
import * as crowd_bt from '../lib/crowd_bt'

function makeUser() {
    return {
        id: _.uniqueId('user'),
        alpha: crowd_bt.ALPHA_PRIOR,
        beta: crowd_bt.BETA_PRIOR,
        // a: null,
        // b: null,
    }
}

function makeItem() {
    return {
        id: _.uniqueId('item'),
        mu: crowd_bt.MU_PRIOR,
        sigma_sq: crowd_bt.SIGMA_SQ_PRIOR,
        updated: 0,
    }
}

function User({ user }) {
    return (
        <fieldset>
            <legend>{user.id}</legend>
            <table>
                <tbody>
                    <tr>
                        <th>Alpha</th>
                        <td>{user.alpha}</td>
                    </tr>
                    <tr>
                        <th>Beta</th>
                        <td>{user.beta}</td>
                    </tr>
                </tbody>
            </table>
        </fieldset>
    )
}

export default function App() {
    // let [items, setItems] = React.useState(() => [makeItem(), makeItem(), makeItem()])
    // let [users, setUsers] = React.useState(() => [makeUser(items)])

    let [state, setState] = React.useState(() => ({
        users: [
            {
                id: 'user1',
                alpha: crowd_bt.ALPHA_PRIOR,
                beta: crowd_bt.BETA_PRIOR,
            },
        ],
        items: [
            {
                id: 'item1',
                mu: crowd_bt.MU_PRIOR,
                sigma_sq: crowd_bt.SIGMA_SQ_PRIOR,
                updated: 0,
            },
        ],
    }))
    let { users, items } = state

    return (
        <div
            style={{
                display: 'flex',
            }}
        >
            <div
                style={{
                    width: '50%',
                }}
            >
                <button
                    onClick={e => {
                        state.users.push(makeUser())
                        setState(_.clone(state))
                        // setUsers([...users, makeUser()])
                    }}
                >
                    Add user
                </button>
                {users.map(user => (
                    <User key={user.id} user={user} />
                ))}
            </div>
            <div
                style={{
                    width: '50%',
                }}
            >
                <button
                    onClick={e => {
                        // setItems([...items, makeItem()])
                    }}
                >
                    Add item
                </button>
                {items.map(item => (
                    <fieldset key={item.id}>
                        <legend>{item.id}</legend>
                        <table>
                            <tbody>
                                <tr>
                                    <th>Mu</th>
                                    <td>{item.mu}</td>
                                </tr>
                                <tr>
                                    <th>Sigma Squared</th>
                                    <td>{item.sigma_sq}</td>
                                </tr>
                            </tbody>
                        </table>
                    </fieldset>
                ))}
            </div>
        </div>
    )
}
