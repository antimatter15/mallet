import psi from 'math-digamma'
import betaln from 'math-betaln'

// See this paper for more information:
// http://people.stern.nyu.edu/xchen3/images/crowd_pairwise.pdf

// parameters chosen according to experiments in paper
export const GAMMA = 0.1 // tradeoff parameter
export const LAMBDA = 1 // regularization parameter
export const KAPPA = 0.0001 // to ensure positivity of variance
export const MU_PRIOR = 0
export const SIGMA_SQ_PRIOR = 1
export const ALPHA_PRIOR = 10
export const BETA_PRIOR = 1
export const EPSILON = 0.25 // epsilon-greedy

// via https://en.wikipedia.org/wiki/Normal_distribution
function divergence_gaussian(
    mu_1: number,
    sigma_sq_1: number,
    mu_2: number,
    sigma_sq_2: number
): number {
    const ratio = sigma_sq_1 / sigma_sq_2
    return (mu_1 - mu_2) ** 2 / (2 * sigma_sq_2) + (ratio - 1 - Math.log(ratio)) / 2
}

// via https://en.wikipedia.org/wiki/Beta_distribution
function divergence_beta(alpha_1: number, beta_1: number, alpha_2: number, beta_2: number): number {
    return (
        betaln(alpha_2, beta_2) -
        betaln(alpha_1, beta_1) +
        (alpha_1 - alpha_2) * psi(alpha_1) +
        (beta_1 - beta_2) * psi(beta_1) +
        (alpha_2 - alpha_1 + beta_2 - beta_1) * psi(alpha_1 + beta_1)
    )
}

// returns new (alpha, beta, mu_winner, sigma_sq_winner, mu_loser, sigma_sq_loser)
export function update(
    alpha: number,
    beta: number,
    mu_winner: number,
    sigma_sq_winner: number,
    mu_loser: number,
    sigma_sq_loser: number
): [number, number, number, number, number, number] {
    const [updated_alpha, updated_beta, _] = _updated_annotator(
        alpha,
        beta,
        mu_winner,
        sigma_sq_winner,
        mu_loser,
        sigma_sq_loser
    )
    const [updated_mu_winner, updated_mu_loser] = _updated_mus(
        alpha,
        beta,
        mu_winner,
        sigma_sq_winner,
        mu_loser,
        sigma_sq_loser
    )
    const [updated_sigma_sq_winner, updated_sigma_sq_loser] = _updated_sigma_sqs(
        alpha,
        beta,
        mu_winner,
        sigma_sq_winner,
        mu_loser,
        sigma_sq_loser
    )
    return [
        updated_alpha,
        updated_beta,
        updated_mu_winner,
        updated_sigma_sq_winner,
        updated_mu_loser,
        updated_sigma_sq_loser,
    ]
}

export function expected_information_gain(
    alpha: number,
    beta: number,
    mu_a: number,
    sigma_sq_a: number,
    mu_b: number,
    sigma_sq_b: number
) {
    const [alpha_1, beta_1, c] = _updated_annotator(alpha, beta, mu_a, sigma_sq_a, mu_b, sigma_sq_b)
    const [mu_a_1, mu_b_1] = _updated_mus(alpha, beta, mu_a, sigma_sq_a, mu_b, sigma_sq_b)
    const [sigma_sq_a_1, sigma_sq_b_1] = _updated_sigma_sqs(
        alpha,
        beta,
        mu_a,
        sigma_sq_a,
        mu_b,
        sigma_sq_b
    )
    const prob_a_ranked_above = c
    const [alpha_2, beta_2, _] = _updated_annotator(alpha, beta, mu_b, sigma_sq_b, mu_a, sigma_sq_a)
    const [mu_b_2, mu_a_2] = _updated_mus(alpha, beta, mu_b, sigma_sq_b, mu_a, sigma_sq_a)
    const [sigma_sq_b_2, sigma_sq_a_2] = _updated_sigma_sqs(
        alpha,
        beta,
        mu_b,
        sigma_sq_b,
        mu_a,
        sigma_sq_a
    )

    return (
        prob_a_ranked_above *
            (divergence_gaussian(mu_a_1, sigma_sq_a_1, mu_a, sigma_sq_a) +
                divergence_gaussian(mu_b_1, sigma_sq_b_1, mu_b, sigma_sq_b) +
                GAMMA * divergence_beta(alpha_1, beta_1, alpha, beta)) +
        (1 - prob_a_ranked_above) *
            (divergence_gaussian(mu_a_2, sigma_sq_a_2, mu_a, sigma_sq_a) +
                divergence_gaussian(mu_b_2, sigma_sq_b_2, mu_b, sigma_sq_b) +
                GAMMA * divergence_beta(alpha_2, beta_2, alpha, beta))
    )
}

// returns (updated mu of winner, updated mu of loser)
function _updated_mus(
    alpha: number,
    beta: number,
    mu_winner: number,
    sigma_sq_winner: number,
    mu_loser: number,
    sigma_sq_loser: number
): [number, number] {
    const mult =
        (alpha * Math.exp(mu_winner)) / (alpha * Math.exp(mu_winner) + beta * Math.exp(mu_loser)) -
        Math.exp(mu_winner) / (Math.exp(mu_winner) + Math.exp(mu_loser))
    const updated_mu_winner = mu_winner + sigma_sq_winner * mult
    const updated_mu_loser = mu_loser - sigma_sq_loser * mult

    return [updated_mu_winner, updated_mu_loser]
}

// returns (updated sigma squared of winner, updated sigma squared of loser)
function _updated_sigma_sqs(
    alpha: number,
    beta: number,
    mu_winner: number,
    sigma_sq_winner: number,
    mu_loser: number,
    sigma_sq_loser: number
): [number, number] {
    const mult =
        (alpha * Math.exp(mu_winner) * beta * Math.exp(mu_loser)) /
            (alpha * Math.exp(mu_winner) + beta * Math.exp(mu_loser)) ** 2 -
        (Math.exp(mu_winner) * Math.exp(mu_loser)) / (Math.exp(mu_winner) + Math.exp(mu_loser)) ** 2

    const updated_sigma_sq_winner = sigma_sq_winner * Math.max(1 + sigma_sq_winner * mult, KAPPA)
    const updated_sigma_sq_loser = sigma_sq_loser * Math.max(1 + sigma_sq_loser * mult, KAPPA)

    return [updated_sigma_sq_winner, updated_sigma_sq_loser]
}

// returns (updated alpha, updated beta, pr i >k j which is c)
function _updated_annotator(
    alpha: number,
    beta: number,
    mu_winner: number,
    sigma_sq_winner: number,
    mu_loser: number,
    sigma_sq_loser: number
): [number, number, number] {
    const c_1 =
        Math.exp(mu_winner) / (Math.exp(mu_winner) + Math.exp(mu_loser)) +
        (0.5 *
            (sigma_sq_winner + sigma_sq_loser) *
            (Math.exp(mu_winner) *
                Math.exp(mu_loser) *
                (Math.exp(mu_loser) - Math.exp(mu_winner)))) /
            (Math.exp(mu_winner) + Math.exp(mu_loser)) ** 3
    const c_2 = 1 - c_1
    const c = (c_1 * alpha + c_2 * beta) / (alpha + beta)

    const expt =
        (c_1 * (alpha + 1) * alpha + c_2 * alpha * beta) / (c * (alpha + beta + 1) * (alpha + beta))
    const expt_sq =
        (c_1 * (alpha + 2) * (alpha + 1) * alpha + c_2 * (alpha + 1) * alpha * beta) /
        (c * (alpha + beta + 2) * (alpha + beta + 1) * (alpha + beta))

    const variance = expt_sq - expt ** 2
    const updated_alpha = ((expt - expt_sq) * expt) / variance
    const updated_beta = ((expt - expt_sq) * (1 - expt)) / variance

    return [updated_alpha, updated_beta, c]
}
